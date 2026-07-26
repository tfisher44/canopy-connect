import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {} from "@arcgis/charts-components/types/react";
import type {} from "@arcgis/ai-components/types/react";
import "@arcgis/ai-components/components/arcgis-assistant";
import "@arcgis/ai-components/components/arcgis-assistant-agent";
import "@arcgis/ai-components/components/arcgis-assistant-data-exploration-agent";
import "@arcgis/ai-components/components/arcgis-assistant-navigation-agent";
import { useMapRuntime } from "../../../map/context/MapContext";
import { useTheme } from "../../../theme/ThemeContext";
import { FeatureLayerChartAgent } from "../agents/featureLayerChartAgent";
import {
  describeSlottedResponsePayload,
  inferChartResponsesFromText,
  slottedResponses,
  type AssistantSlottableRequestDetail,
} from "./slottedResponses";
import {
  getFeatureLayerChartDetails,
  type FeatureLayerChartDetail,
} from "../services/chartCatalog";
import {
  getAllRenderableCharts,
  selectBestChartMatch,
} from "../services/chartMatching";

type AssistantChartElement = HTMLElement & {
  chartIndex?: number;
  layer?: unknown;
  layerItemId?: string;
  model?: unknown;
  skipChartCreationQueue?: boolean;
  componentOnReady?: () => Promise<unknown>;
  loadModel?: () => Promise<void>;
  refresh?: (props?: {
    updateData?: boolean;
    resetAxesBounds?: boolean;
  }) => Promise<void>;
};

type AssistantChartSuggestion = {
  layerItemId: string;
  chartIndex: number;
  title: string;
};

type AssistantResponseMessage = {
  id: string;
  role: "assistant" | "user";
  content?: string;
  blocks?: Array<{
    type?: string;
    data?: Record<string, unknown>;
    isPending?: boolean;
  }>;
};

type AssistantMessagesCollection = {
  toArray?: () => unknown[];
  splice: (start: number, deleteCount: number, ...items: unknown[]) => unknown;
};

type AssistantElementBridge = {
  messages?: AssistantMessagesCollection;
};

const CHART_NO_MATCH_RESPONSE =
  "I couldn't find a confident configured chart match for that request.";
const CHART_BIND_MAX_ATTEMPTS = 3;
const BRIDGE_LOGGING_ENABLED =
  import.meta.env.VITE_BRIDGE_LOGGING_ENABLED === "true";

function getDetailMessage(detail: unknown, fallbackMessage: string): string {
  if (typeof detail === "string" && detail.trim().length > 0) {
    return detail;
  }
  if (detail && typeof detail === "object" && "message" in detail) {
    const message = (detail as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }
  return fallbackMessage;
}

function hasExistingChartBlock(
  blocks: AssistantResponseMessage["blocks"] | undefined,
): boolean {
  if (!blocks) {
    return false;
  }

  return blocks.some((block) => {
    const blockType =
      typeof block.type === "string" ? block.type.toLowerCase() : "";
    if (blockType === "arcgis-chart" || blockType === "chart") {
      return true;
    }
    const blockData = block.data;
    return (
      blockData?.layerItemId !== undefined ||
      blockData?.["layer-item-id"] !== undefined ||
      blockData?.chartIndex !== undefined ||
      blockData?.["chart-index"] !== undefined
    );
  });
}

function suppressChartNoMatchResponse(
  content: string | undefined,
): string | undefined {
  if (!content) {
    return content;
  }

  if (content.trim() === CHART_NO_MATCH_RESPONSE) {
    return undefined;
  }

  return content;
}

function isPendingAssistantMessage(
  message: AssistantResponseMessage,
): boolean {
  return (message.blocks ?? []).some((block) => block.isPending === true);
}

function shouldHandleDirectChartPrompt(userRequest: string): boolean {
  const normalized = userRequest.toLowerCase();
  return (
    /\b(show|render|preview|visualize|surface)\b/.test(normalized) &&
    /\b(chart|charts|insight|insights)\b/.test(normalized)
  );
}

function shouldRenderAllCharts(userRequest: string): boolean {
  const normalized = userRequest.toLowerCase();
  return /\ball\b|\bevery\b|\beach\b/.test(normalized);
}

function ArcgisChartRenderer({
  slotName,
  layerItemId,
  chartIndex,
  title,
  fallbackLayer,
  fallbackModel,
  onBridgeLog,
}: {
  slotName: string;
  layerItemId: string;
  chartIndex: number;
  title?: string;
  fallbackLayer?: unknown;
  fallbackModel?: unknown;
  onBridgeLog: (message: string, payload?: unknown) => void;
}) {
  const [renderMode, setRenderMode] = useState<"model" | "layer">("model");
  const [didRenderComplete, setDidRenderComplete] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const chartElementRef = useRef<AssistantChartElement | null>(null);
  const fallbackLayerSource = fallbackLayer;
  const canFallbackToLayer = Boolean(fallbackLayerSource);
  const canRenderFromModel = Boolean(fallbackLayerSource && fallbackModel);

  const fallbackToLayer = useCallback(
    (reason: string) => {
      if (!canFallbackToLayer || renderMode !== "model") {
        return;
      }
      onBridgeLog("chart:fallback-to-layer", {
        reason,
        slotName,
        layerItemId,
        chartIndex,
      });
      setDidRenderComplete(false);
      setCardError(null);
      setRenderMode("layer");
    },
    [
      canFallbackToLayer,
      chartIndex,
      layerItemId,
      onBridgeLog,
      renderMode,
      slotName,
    ],
  );

  useEffect(() => {
    onBridgeLog("chart:render-mode", {
      slotName,
      layerItemId,
      chartIndex,
      renderMode,
      canFallbackToLayer,
      canRenderFromModel,
    });
  }, [
    canFallbackToLayer,
    canRenderFromModel,
    chartIndex,
    layerItemId,
    onBridgeLog,
    renderMode,
    slotName,
  ]);

  useEffect(() => {
    if (didRenderComplete || renderMode !== "model") {
      return;
    }
    const timer = window.setTimeout(() => {
      onBridgeLog("chart:lifecycle-slow", {
        slotName,
        layerItemId,
        chartIndex,
        renderMode,
      });
      if (renderMode === "model") {
        fallbackToLayer("render-timeout");
      } else {
        setCardError("Chart is taking longer than expected. Please try again.");
      }
    }, 8000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [
    chartIndex,
    didRenderComplete,
    layerItemId,
    onBridgeLog,
    fallbackToLayer,
    renderMode,
    slotName,
  ]);

  useEffect(() => {
    const chartNode = chartElementRef.current;
    if (!chartNode) {
      return;
    }
    chartNode.setAttribute("skip-chart-creation-queue", "true");
    chartNode.skipChartCreationQueue = true;
    chartNode.setAttribute("data-render-mode", renderMode);
    chartNode.setAttribute("data-chart-index", String(chartIndex));

    let isCancelled = false;
    const bindChart = async () => {
      if (typeof chartNode.componentOnReady === "function") {
        await chartNode.componentOnReady();
      }
      if (isCancelled) {
        return;
      }

      if (renderMode === "model") {
        if (!canRenderFromModel) {
          chartNode.setAttribute("layer-item-id", layerItemId);
          chartNode.setAttribute("chart-index", String(chartIndex));
          chartNode.layerItemId = layerItemId;
          chartNode.chartIndex = chartIndex;
          chartNode.layer = undefined;
          chartNode.model = undefined;
          onBridgeLog("chart:direct-bind", {
            slotName,
            layerItemId,
            chartIndex,
          });
          if (typeof chartNode.refresh === "function") {
            await chartNode.refresh({ updateData: true });
          }
          return;
        }

        chartNode.removeAttribute("layer-item-id");
        chartNode.removeAttribute("chart-index");
        chartNode.chartIndex = undefined;
        chartNode.layerItemId = undefined;
        chartNode.layer = fallbackLayerSource;
        chartNode.model = fallbackModel;
        onBridgeLog("chart:model-bind", {
          slotName,
          layerItemId,
          chartIndex,
          hasFallbackLayer: Boolean(fallbackLayerSource),
          hasFallbackModel: Boolean(fallbackModel),
        });
        if (typeof chartNode.loadModel === "function") {
          await chartNode.loadModel();
        }
        if (isCancelled) {
          return;
        }
        if (typeof chartNode.refresh === "function") {
          await chartNode.refresh({ updateData: true });
        }
        return;
      }

      if (layerItemId.trim().length > 0) {
        chartNode.setAttribute("layer-item-id", layerItemId);
        chartNode.setAttribute("chart-index", String(chartIndex));
        chartNode.layerItemId = layerItemId;
        chartNode.chartIndex = chartIndex;
        chartNode.layer = undefined;
        chartNode.model = undefined;
        onBridgeLog("chart:direct-bind-layer-mode", {
          slotName,
          layerItemId,
          chartIndex,
        });
      } else if (fallbackLayerSource) {
        chartNode.removeAttribute("layer-item-id");
        chartNode.setAttribute("chart-index", String(chartIndex));
        chartNode.chartIndex = chartIndex;
        chartNode.layerItemId = undefined;
        chartNode.layer = fallbackLayerSource;
        chartNode.model = undefined;
      } else {
        throw new Error("No chart binding source available.");
      }
      if (typeof chartNode.refresh === "function") {
        await chartNode.refresh({ updateData: true });
      }
    };

    const bindWithRetries = async () => {
      for (let attempt = 1; attempt <= CHART_BIND_MAX_ATTEMPTS; attempt += 1) {
        try {
          await bindChart();
          if (!isCancelled) {
            setCardError(null);
          }
          onBridgeLog("chart:bind-success", {
            slotName,
            renderMode,
            chartIndex,
            attempt,
          });
          return;
        } catch (cause: unknown) {
          const message =
            cause instanceof Error ? cause.message : "Chart binding failed.";
          onBridgeLog("chart:bind-error", {
            slotName,
            renderMode,
            chartIndex,
            attempt,
            message,
          });
          if (renderMode === "model" && canFallbackToLayer) {
            fallbackToLayer("bind-error");
            return;
          }
          if (attempt >= CHART_BIND_MAX_ATTEMPTS) {
            if (!isCancelled) {
              setCardError(message);
            }
            return;
          }
          const backoffMs = attempt * 500;
          await new Promise<void>((resolve) => {
            window.setTimeout(() => resolve(), backoffMs);
          });
          if (isCancelled) {
            return;
          }
        }
      }
    };

    void bindWithRetries();

    onBridgeLog("chart:bound-config", {
      slotName,
      renderMode,
      chartIndex,
      hasLayerItemId: chartNode.hasAttribute("layer-item-id"),
      hasChartIndex: chartNode.hasAttribute("chart-index"),
      usingLayerView: false,
      hasFallbackModel: Boolean(fallbackModel),
    });

    return () => {
      isCancelled = true;
    };
  }, [
    chartIndex,
    fallbackLayerSource,
    fallbackModel,
    layerItemId,
    fallbackToLayer,
    canFallbackToLayer,
    canRenderFromModel,
    onBridgeLog,
    renderMode,
    slotName,
  ]);

  return (
    <section className="arcgis-assistant__chart-card" slot={slotName}>
      <header className="arcgis-assistant__chart-card-header">
        <strong>{title ?? "Layer chart preview"}</strong>
        <span>
          {layerItemId} · chart {chartIndex}
        </span>
      </header>
      <div className="arcgis-assistant__chart-frame">
        {renderMode === "model" ? (
          <arcgis-chart
            key={`${slotName}:model:${layerItemId}:${chartIndex}`}
            ref={(node) => {
              chartElementRef.current = node;
            }}
            className="arcgis-assistant__chart"
            autoDestroyDisabled={true}
            onarcgisChartNotFoundWarning={(event) => {
              onBridgeLog("chart:not-found-warning", event.detail);
              fallbackToLayer("chart-not-found-warning");
            }}
            onarcgisRuntimeError={(event) => {
              onBridgeLog("chart:runtime-error", event.detail);
              fallbackToLayer("runtime-error");
            }}
            onarcgisInvalidConfigWarningRaise={(event) => {
              onBridgeLog("chart:invalid-config", event.detail);
            }}
            onarcgisNoRenderPropChange={(event) => {
              onBridgeLog("chart:no-render-prop-change", event.detail);
            }}
            onarcgisDataProcessComplete={(event) => {
              setDidRenderComplete(true);
              setCardError(null);
              onBridgeLog("chart:data-process-complete", event.detail);
            }}
            onarcgisDataProcessError={(event) => {
              onBridgeLog("chart:data-process-error", event.detail);
              fallbackToLayer("data-process-error");
            }}
            onarcgisUpdateComplete={(event) => {
              setDidRenderComplete(true);
              setCardError(null);
              onBridgeLog("chart:update-complete", event.detail);
            }}
            onarcgisRenderingComplete={() => {
              setDidRenderComplete(true);
              setCardError(null);
              onBridgeLog("chart:rendering-complete", {
                layerItemId,
                chartIndex,
                slotName,
                renderMode,
              });
            }}
          />
        ) : (
          <arcgis-chart
            key={`${slotName}:layer:${layerItemId}:${chartIndex}`}
            ref={(node) => {
              chartElementRef.current = node;
            }}
            className="arcgis-assistant__chart"
            autoDestroyDisabled={true}
            onarcgisChartNotFoundWarning={(event) => {
              onBridgeLog("chart:not-found-warning", event.detail);
              setCardError(
                getDetailMessage(
                  event.detail,
                  "Configured chart could not be found.",
                ),
              );
            }}
            onarcgisRuntimeError={(event) => {
              onBridgeLog("chart:runtime-error", event.detail);
              setCardError(
                getDetailMessage(
                  event.detail,
                  "A chart runtime error occurred.",
                ),
              );
            }}
            onarcgisInvalidConfigWarningRaise={(event) => {
              onBridgeLog("chart:invalid-config", event.detail);
            }}
            onarcgisNoRenderPropChange={(event) => {
              onBridgeLog("chart:no-render-prop-change", event.detail);
            }}
            onarcgisDataProcessComplete={(event) => {
              setDidRenderComplete(true);
              setCardError(null);
              onBridgeLog("chart:data-process-complete", event.detail);
            }}
            onarcgisDataProcessError={(event) => {
              onBridgeLog("chart:data-process-error", event.detail);
              setCardError(
                getDetailMessage(
                  event.detail,
                  "Chart data could not be processed.",
                ),
              );
            }}
            onarcgisUpdateComplete={(event) => {
              setDidRenderComplete(true);
              setCardError(null);
              onBridgeLog("chart:update-complete", event.detail);
            }}
            onarcgisRenderingComplete={() => {
              setDidRenderComplete(true);
              setCardError(null);
              onBridgeLog("chart:rendering-complete", {
                layerItemId,
                chartIndex,
                slotName,
                renderMode,
              });
            }}
          />
        )}
      </div>
      {cardError ? (
        <p className="arcgis-assistant__chart-error">{cardError}</p>
      ) : null}
    </section>
  );
}

export function ArcgisAssistantPanel() {
  const { mapView, webMap, status } = useMapRuntime();
  const { colorMode } = useTheme();
  const assistantElementRef = useRef<HTMLElement | null>(null);
  const pendingDirectChartsRef = useRef<AssistantChartSuggestion[] | null>(
    null,
  );
  const [chartDetails, setChartDetails] = useState<FeatureLayerChartDetail[]>(
    [],
  );
  const [chartDiscoveryError, setChartDiscoveryError] = useState<string | null>(
    null,
  );
  const [slottedCharts, setSlottedCharts] = useState<
    Array<{
      slotName: string;
      layerItemId: string;
      chartIndex: number;
      title: string;
    }>
  >([]);
  const [bridgeLogs, setBridgeLogs] = useState<string[]>([]);
  const lastBridgeLogRef = useRef<{ key: string; at: number } | null>(null);
  const activeWebMapId =
    typeof webMap?.portalItem?.id === "string" &&
    webMap.portalItem.id.trim().length > 0
      ? webMap.portalItem.id
      : null;

  const appendBridgeLog = useCallback((message: string, payload?: unknown) => {
    if (!BRIDGE_LOGGING_ENABLED) {
      return;
    }
    if (
      message === "slot:request" ||
      message === "slot:ignored-no-chart-payload" ||
      message === "chart:update-complete" ||
      message === "chart:no-render-prop-change" ||
      message === "chart:data-process-complete"
    ) {
      return;
    }
    const stamp = new Date().toISOString().slice(11, 23);
    const payloadText =
      payload === undefined ? "" : ` ${JSON.stringify(payload)}`;
    const logKey = `${message}${payloadText}`;
    const now = Date.now();
    const lastLog = lastBridgeLogRef.current;
    if (lastLog && lastLog.key === logKey && now - lastLog.at < 500) {
      return;
    }
    lastBridgeLogRef.current = { key: logKey, at: now };
    const line = `${stamp} ${message}${payloadText}`;
    console.log("[assistant-bridge]", message, payload ?? "");
    setBridgeLogs((current) => [...current.slice(-39), line]);
  }, []);

  const chartCatalogContext = useMemo(
    () => async () => ({
      chartCatalog: mapView
        ? await (async () => {
            appendBridgeLog("context:refresh-catalog:start");
            const next = await getFeatureLayerChartDetails(mapView);
            appendBridgeLog("context:refresh-catalog:done", {
              layerCount: next.length,
            });
            return next;
          })()
        : chartDetails,
    }),
    [appendBridgeLog, chartDetails, mapView],
  );

  useEffect(() => {
    if (!mapView) {
      console.log("[assistant-bridge]", "catalog:skip-map-not-ready");
      return;
    }

    let isDisposed = false;
    console.log("[assistant-bridge]", "catalog:initial-load:start", {
      webMapId: activeWebMapId,
    });
    pendingDirectChartsRef.current = null;
    const loadChartDetailsWithRetry = async () => {
      for (let attempt = 1; attempt <= CHART_BIND_MAX_ATTEMPTS; attempt += 1) {
        const nextDetails = await getFeatureLayerChartDetails(mapView);
        if (nextDetails.length > 0 || attempt >= CHART_BIND_MAX_ATTEMPTS) {
          return nextDetails;
        }
        const waitMs = attempt * 500;
        appendBridgeLog("catalog:initial-load:retry", {
          webMapId: activeWebMapId,
          attempt,
          waitMs,
        });
        await new Promise<void>((resolve) => {
          window.setTimeout(() => resolve(), waitMs);
        });
      }
      return [];
    };

    void loadChartDetailsWithRetry()
      .then((nextDetails) => {
        if (!isDisposed) {
          setChartDetails(nextDetails);
          setChartDiscoveryError(null);
          setSlottedCharts([]);
          appendBridgeLog("catalog:initial-load:done", {
            webMapId: activeWebMapId,
            layerCount: nextDetails.length,
          });
        }
      })
      .catch((cause: unknown) => {
        if (isDisposed) {
          return;
        }
        const message =
          cause instanceof Error
            ? cause.message
            : "Unable to discover layer charts.";
        setChartDiscoveryError(message);
        appendBridgeLog("catalog:initial-load:error", {
          webMapId: activeWebMapId,
          message,
        });
      });

    return () => {
      isDisposed = true;
    };
  }, [activeWebMapId, appendBridgeLog, mapView]);

  const copyBridgeLogs = useCallback(async () => {
    if (!navigator.clipboard) {
      appendBridgeLog("copy:clipboard-unavailable");
      return;
    }
    const content = bridgeLogs.join("\n");
    try {
      await navigator.clipboard.writeText(content);
      appendBridgeLog("copy:success", { lines: bridgeLogs.length });
    } catch (cause: unknown) {
      const message =
        cause instanceof Error ? cause.message : "Clipboard write failed.";
      appendBridgeLog("copy:error", { message });
    }
  }, [appendBridgeLog, bridgeLogs]);

  const getDirectChartSuggestions = useCallback(
    (userRequest: string): AssistantChartSuggestion[] => {
      if (!shouldHandleDirectChartPrompt(userRequest)) {
        return [];
      }

      if (shouldRenderAllCharts(userRequest)) {
        return getAllRenderableCharts(chartDetails).map((chart) => ({
          layerItemId: chart.layerItemId,
          chartIndex: chart.chartIndex,
          title: chart.title,
        }));
      }

      const selectedMatch = selectBestChartMatch(userRequest, chartDetails);
      if (!selectedMatch?.layer.layerItemId) {
        return [];
      }

      return [
        {
          layerItemId: selectedMatch.layer.layerItemId,
          chartIndex: selectedMatch.chartIndex,
          title: selectedMatch.title,
        },
      ];
    },
    [chartDetails],
  );

  return (
    <section className="arcgis-assistant" aria-label="ArcGIS assistant panel">
      <arcgis-assistant
        ref={(node) => {
          assistantElementRef.current = node;
        }}
        className={`arcgis-assistant__root calcite-mode-${colorMode}`}
        referenceElement="main-map"
        heading="Assistant"
        description="Map help + charts."
        entryMessage="Ask for map help or charts."
        suggestedPrompts={["Show all configured insights.", "Go to ESRI"]}
        keepSuggestedPrompts={true}
        copyEnabled={true}
        logEnabled={BRIDGE_LOGGING_ENABLED}
        onarcgisSubmit={(event: { detail: string }) => {
          const suggestions = getDirectChartSuggestions(event.detail);
          pendingDirectChartsRef.current =
            suggestions.length > 0 ? suggestions : null;
          appendBridgeLog("submit", {
            prompt: event.detail,
            directChartCount: suggestions.length,
          });
        }}
        onarcgisResponse={(event: { detail: AssistantResponseMessage }) => {
          if (isPendingAssistantMessage(event.detail)) {
            return;
          }
          const assistantNode = assistantElementRef.current;
          const messages = (assistantNode as AssistantElementBridge | null)
            ?.messages;
          if (!messages) {
            return;
          }
          const messageList =
            typeof messages.toArray === "function"
              ? (messages.toArray() as AssistantResponseMessage[])
              : [];
          const messageIndex = messageList.findIndex(
            (message) =>
              message.id === event.detail.id && message.role === "assistant",
          );
          if (messageIndex < 0) {
            return;
          }

          const currentMessage = messageList[messageIndex];
          const nextContent = suppressChartNoMatchResponse(
            currentMessage.content,
          );
          const pendingSuggestions = pendingDirectChartsRef.current;
          if (!pendingSuggestions || pendingSuggestions.length === 0) {
            if (nextContent === currentMessage.content) {
              return;
            }
            messages.splice(messageIndex, 1, {
              ...currentMessage,
              content: nextContent,
            });
            appendBridgeLog("direct-chart:no-match-suppressed", {
              messageId: event.detail.id,
            });
            return;
          }

          const existingBlocks = currentMessage.blocks ?? [];
          const existingChartBlock = hasExistingChartBlock(existingBlocks);
          const nextBlocks = existingChartBlock
            ? existingBlocks
            : [
                ...existingBlocks,
                ...pendingSuggestions.map((suggestion) => ({
                  type: "arcgis-chart",
                  data: {
                    title: suggestion.title,
                    chartIndex: suggestion.chartIndex,
                    "chart-index": suggestion.chartIndex,
                    layerItemId: suggestion.layerItemId,
                    "layer-item-id": suggestion.layerItemId,
                  },
                })),
              ];

          if (
            nextContent === currentMessage.content &&
            nextBlocks === existingBlocks
          ) {
            pendingDirectChartsRef.current = null;
            return;
          }

          messages.splice(messageIndex, 1, {
            ...currentMessage,
            content: nextContent,
            blocks: nextBlocks,
          });
          pendingDirectChartsRef.current = null;
          appendBridgeLog(
            existingChartBlock
              ? "direct-chart:response-suppressed"
              : "direct-chart:injected",
            {
              messageId: event.detail.id,
              count: pendingSuggestions.length,
            },
          );
        }}
        onarcgisSlottableRequest={(event: {
          detail: AssistantSlottableRequestDetail;
        }) => {
          const detail = event.detail;
          const blockRecord =
            detail.data?.block && typeof detail.data.block === "object"
              ? (detail.data.block as Record<string, unknown>)
              : null;
          const isPendingBlock = blockRecord?.isPending === true;
          if (detail.name === "block" && isPendingBlock) {
            return;
          }
          appendBridgeLog("slot:request", {
            name: detail.name,
            slotName: detail.slotName,
            hasData: Boolean(detail.data),
            index: detail.data?.index,
            hasBlock: Boolean(detail.data?.block),
          });
          if (!detail.data) {
            setSlottedCharts((current) => {
              const next = current.filter(
                (entry) => entry.slotName !== detail.slotName,
              );
              if (next.length !== current.length) {
                appendBridgeLog("slot:removed", { slotName: detail.slotName });
              }
              return next.length === current.length ? current : next;
            });
            return;
          }

          const nextRequest = slottedResponses(detail, chartDetails);
          if (!nextRequest) {
            const inferredRequests = inferChartResponsesFromText(
              detail,
              chartDetails,
            );
            if (inferredRequests.length > 0) {
              setSlottedCharts((current) => {
                const existingForSlot = current.filter(
                  (entry) => entry.slotName === detail.slotName,
                );
                const isSame =
                  existingForSlot.length === inferredRequests.length &&
                  inferredRequests.every((inferred) =>
                    existingForSlot.some(
                      (existing) =>
                        existing.layerItemId === inferred.layerItemId &&
                        existing.chartIndex === inferred.chartIndex &&
                        existing.title === inferred.title,
                    ),
                  );
                if (isSame) {
                  return current;
                }

                appendBridgeLog("slot:upsert-inferred", {
                  slotName: detail.slotName,
                  count: inferredRequests.length,
                });
                const outsideSlot = current.filter(
                  (entry) => entry.slotName !== detail.slotName,
                );
                return [...outsideSlot, ...inferredRequests];
              });
              return;
            }
            appendBridgeLog(
              "slot:ignored-no-chart-payload",
              describeSlottedResponsePayload(detail),
            );
            return;
          }

          setSlottedCharts((current) => {
            const existing = current.find(
              (entry) => entry.slotName === nextRequest.slotName,
            );
            if (
              existing &&
              existing.layerItemId === nextRequest.layerItemId &&
              existing.chartIndex === nextRequest.chartIndex &&
              existing.title === nextRequest.title
            ) {
              return current;
            }
            const withoutSlot = current.filter(
              (entry) => entry.slotName !== nextRequest.slotName,
            );
            appendBridgeLog("slot:upsert", {
              slotName: nextRequest.slotName,
              layerItemId: nextRequest.layerItemId,
              chartIndex: nextRequest.chartIndex,
            });
            return [...withoutSlot, nextRequest];
          });
        }}
      >
        <arcgis-assistant-navigation-agent />
        <arcgis-assistant-agent
          agent={FeatureLayerChartAgent}
          context={chartCatalogContext}
        />
        <arcgis-assistant-data-exploration-agent />
        {BRIDGE_LOGGING_ENABLED ? (
          <div className="arcgis-assistant__bridge-logs" slot="footer-content">
            <div className="arcgis-assistant__bridge-logs-header">
              <strong>Bridge logs</strong>
              <button
                type="button"
                className="button button--ghost arcgis-assistant__bridge-copy"
                onClick={() => {
                  void copyBridgeLogs();
                }}
              >
                Copy logs
              </button>
            </div>
            <ul className="arcgis-assistant__bridge-log-list">
              {bridgeLogs.map((line, index) => (
                <li key={`${index}-${line}`}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {slottedCharts.map((slottedChart) =>
          (() => {
            const matchingCatalogEntry = chartDetails.find(
              (entry) =>
                entry.layerItemId === slottedChart.layerItemId &&
                entry.chartIndexes.includes(slottedChart.chartIndex),
            );
            return (
              <ArcgisChartRenderer
                key={`${slottedChart.slotName}:${slottedChart.layerItemId}:${slottedChart.chartIndex}:${Boolean(matchingCatalogEntry?.chartModels[slottedChart.chartIndex])}`}
                slotName={slottedChart.slotName}
                layerItemId={slottedChart.layerItemId}
                chartIndex={slottedChart.chartIndex}
                title={slottedChart.title}
                fallbackLayer={matchingCatalogEntry?.layerRef}
                fallbackModel={
                  matchingCatalogEntry?.chartModels[slottedChart.chartIndex]
                }
                onBridgeLog={appendBridgeLog}
              />
            );
          })(),
        )}
      </arcgis-assistant>
      {chartDiscoveryError ? (
        <p className="error arcgis-assistant__error">{chartDiscoveryError}</p>
      ) : null}
      {status !== "ready" ? (
        <p className="muted arcgis-assistant__status">Map loading…</p>
      ) : null}
    </section>
  );
}
