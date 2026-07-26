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

type AssistantChartElement = HTMLElement & {
  chartIndex?: number;
  layer?: unknown;
  layerItemId?: string;
  model?: unknown;
  skipChartCreationQueue?: boolean;
  componentOnReady?: () => Promise<unknown>;
  loadModel?: () => Promise<void>;
  refresh?: (props?: { updateData?: boolean; resetAxesBounds?: boolean }) => Promise<void>;
};

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
      setRenderMode("layer");
    },
    [canFallbackToLayer, chartIndex, layerItemId, onBridgeLog, renderMode, slotName],
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
      fallbackToLayer("no-lifecycle-events-timeout");
    }, 4500);
    return () => {
      window.clearTimeout(timer);
    };
  }, [didRenderComplete, fallbackToLayer, renderMode]);

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
      if (renderMode === "model") {
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
        if (typeof chartNode.componentOnReady === "function") {
          await chartNode.componentOnReady();
        }
        if (isCancelled) {
          return;
        }
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

      chartNode.removeAttribute("layer-item-id");
      chartNode.setAttribute("chart-index", String(chartIndex));
      chartNode.chartIndex = chartIndex;
      chartNode.layerItemId = undefined;
      chartNode.layer = fallbackLayerSource;
      chartNode.model = undefined;
      if (typeof chartNode.refresh === "function") {
        await chartNode.refresh({ updateData: true });
      }
    };

    void bindChart().catch((cause: unknown) => {
      const message =
        cause instanceof Error ? cause.message : "Chart binding failed.";
      onBridgeLog("chart:bind-error", {
        slotName,
        renderMode,
        chartIndex,
        message,
      });
      fallbackToLayer("bind-error");
    });

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
            onBridgeLog("chart:data-process-complete", event.detail);
          }}
          onarcgisDataProcessError={(event) => {
            onBridgeLog("chart:data-process-error", event.detail);
            fallbackToLayer("data-process-error");
          }}
          onarcgisUpdateComplete={(event) => {
            setDidRenderComplete(true);
            onBridgeLog("chart:update-complete", event.detail);
          }}
          onarcgisRenderingComplete={() => {
            setDidRenderComplete(true);
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
          }}
          onarcgisRuntimeError={(event) => {
            onBridgeLog("chart:runtime-error", event.detail);
          }}
          onarcgisInvalidConfigWarningRaise={(event) => {
            onBridgeLog("chart:invalid-config", event.detail);
          }}
          onarcgisNoRenderPropChange={(event) => {
            onBridgeLog("chart:no-render-prop-change", event.detail);
          }}
          onarcgisDataProcessComplete={(event) => {
            setDidRenderComplete(true);
            onBridgeLog("chart:data-process-complete", event.detail);
          }}
          onarcgisDataProcessError={(event) => {
            onBridgeLog("chart:data-process-error", event.detail);
          }}
          onarcgisUpdateComplete={(event) => {
            setDidRenderComplete(true);
            onBridgeLog("chart:update-complete", event.detail);
          }}
          onarcgisRenderingComplete={() => {
            setDidRenderComplete(true);
            onBridgeLog("chart:rendering-complete", {
              layerItemId,
              chartIndex,
              slotName,
              renderMode,
            });
          }}
        />
      )}
    </section>
  );
}

export function ArcgisAssistantPanel() {
  const { mapView, status } = useMapRuntime();
  const { colorMode } = useTheme();
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

  const appendBridgeLog = useCallback((message: string, payload?: unknown) => {
    if (
      message === "slot:request" ||
      message === "slot:ignored-no-chart-payload"
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
    setBridgeLogs((current) => [...current.slice(-79), line]);
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
    console.log("[assistant-bridge]", "catalog:initial-load:start");
    void getFeatureLayerChartDetails(mapView)
      .then((nextDetails) => {
        if (!isDisposed) {
          setChartDetails(nextDetails);
          setChartDiscoveryError(null);
          appendBridgeLog("catalog:initial-load:done", {
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
        appendBridgeLog("catalog:initial-load:error", { message });
      });

    return () => {
      isDisposed = true;
    };
  }, [appendBridgeLog, mapView]);

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

  return (
    <section className="arcgis-assistant" aria-label="ArcGIS assistant panel">
      <arcgis-assistant
        className={`arcgis-assistant__root calcite-mode-${colorMode}`}
        referenceElement="main-map"
        heading="Assistant"
        description="Map help + charts."
        entryMessage="Ask for map help or charts."
        suggestedPrompts={[
          "Show a chart for tree layers.",
          "Show all configured insights.",
          "Render chart 2 for trees with stories.",
          "Go to Fresno, then show a chart.",
        ]}
        keepSuggestedPrompts={true}
        copyEnabled={true}
        logEnabled={import.meta.env.DEV}
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
        <arcgis-assistant-data-exploration-agent />
        <arcgis-assistant-agent
          agent={FeatureLayerChartAgent}
          context={chartCatalogContext}
        />
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
            {bridgeLogs.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
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
