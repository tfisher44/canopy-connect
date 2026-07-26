import type { FeatureLayerChartDetail } from "../services/chartCatalog";

type UXSuggestion = {
  type?: string;
  data?: Record<string, unknown>;
};

type AssistantMessage = {
  blocks?: UXSuggestion[];
};

export type AssistantSlottableRequestData = {
  message: AssistantMessage;
  block?: UXSuggestion;
  index?: number;
};

export type AssistantSlottableRequestDetail = {
  name: "block" | "message";
  slotName: string;
  data?: AssistantSlottableRequestData;
};

export type SlottedChartResponse = {
  slotName: string;
  layerItemId: string;
  chartIndex: number;
  title: string;
};

type SlottablePayload = Record<string, unknown>;

function toPayload(data: AssistantSlottableRequestData | undefined): SlottablePayload | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const block = asRecord(data.block);
  if (!block) {
    return null;
  }
  return block;
}

function asRecord(value: unknown): SlottablePayload | null {
  return value && typeof value === "object" ? (value as SlottablePayload) : null;
}

function getBlockFromMessage(
  data: AssistantSlottableRequestData,
): SlottablePayload | null {
  const blocks = data.message?.blocks;
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return null;
  }
  if (typeof data.index === "number" && data.index >= 0 && data.index < blocks.length) {
    return asRecord(blocks[data.index]);
  }
  return null;
}

function getPayloadCandidates(payload: SlottablePayload): SlottablePayload[] {
  const candidates: SlottablePayload[] = [payload];
  const nestedKeys = ["data", "payload", "suggestion", "value"] as const;
  for (const key of nestedKeys) {
    const nested = asRecord(payload[key]);
    if (nested) {
      candidates.push(nested);
    }
  }
  const parts = payload.parts;
  if (Array.isArray(parts)) {
    for (const part of parts) {
      const partRecord = asRecord(part);
      if (partRecord) {
        candidates.push(partRecord);
        const partData = asRecord(partRecord.data);
        if (partData) {
          candidates.push(partData);
        }
      }
      if (typeof part === "string") {
        try {
          const parsed = JSON.parse(part) as unknown;
          const parsedRecord = asRecord(parsed);
          if (parsedRecord) {
            candidates.push(parsedRecord);
          }
        } catch {
          // Non-JSON part text is ignored.
        }
      }
    }
  }
  return candidates;
}

function getDetailPayloadCandidates(
  detail: AssistantSlottableRequestDetail,
): SlottablePayload[] {
  if (!detail.data) {
    return [];
  }

  const candidates: SlottablePayload[] = [];
  const fromBlock = toPayload(detail.data);
  if (fromBlock) {
    candidates.push(fromBlock);
  }

  const fromMessageBlock = getBlockFromMessage(detail.data);
  if (fromMessageBlock) {
    candidates.push(fromMessageBlock);
  }

  if (detail.name === "message") {
    const message = asRecord(detail.data.message);
    if (message) {
      candidates.push(message);
    }
  }

  return candidates;
}

function toStringValue(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNumberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed));
    }
  }
  return null;
}

function resolveLayerItemId(
  payload: SlottablePayload,
  chartCatalog: FeatureLayerChartDetail[],
): string | null {
  const directLayerReference =
    toStringValue(payload.layerItemId) ??
    toStringValue(payload["layer-item-id"]);

  if (!directLayerReference) {
    return null;
  }

  const exactItemIdMatch = chartCatalog.find(
    (entry) => entry.layerItemId === directLayerReference,
  );
  if (exactItemIdMatch?.layerItemId) {
    return exactItemIdMatch.layerItemId;
  }

  return directLayerReference;
}

function getSuggestionType(payload: SlottablePayload): string {
  return (
    toStringValue(payload.type) ??
    toStringValue(payload.suggestionType) ??
    toStringValue(payload.kind) ??
    ""
  );
}

function getTextParts(payload: SlottablePayload): string[] {
  const directParts = Array.isArray(payload.parts) ? payload.parts : [];
  const dataPartsRecord = asRecord(payload.data);
  const nestedParts = Array.isArray(dataPartsRecord?.parts) ? dataPartsRecord.parts : [];
  const allParts = [...directParts, ...nestedParts];
  const texts: string[] = [];

  for (const part of allParts) {
    if (typeof part === "string") {
      if (part.trim().length > 0) {
        texts.push(part);
      }
      continue;
    }

    const partRecord = asRecord(part);
    if (!partRecord) {
      continue;
    }

    const textCandidate =
      toStringValue(partRecord.text) ??
      toStringValue(partRecord.content) ??
      toStringValue(asRecord(partRecord.data)?.text) ??
      toStringValue(asRecord(partRecord.data)?.content);
    if (textCandidate) {
      texts.push(textCandidate);
    }
  }

  return texts;
}

function hasChartSignal(payload: SlottablePayload): boolean {
  return (
    payload.layerItemId !== undefined ||
    payload["layer-item-id"] !== undefined ||
    payload.chartIndex !== undefined ||
    payload["chart-index"] !== undefined
  );
}

export function describeSlottedResponsePayload(
  detail: AssistantSlottableRequestDetail,
): Record<string, unknown> {
  const payloadCandidates = getDetailPayloadCandidates(detail);
  if (payloadCandidates.length === 0) {
    return { payload: "none" };
  }
  const expandedCandidates = payloadCandidates.flatMap((candidate) =>
    getPayloadCandidates(candidate),
  );
  return {
    payloadKeys: payloadCandidates.map((candidate) =>
      Object.keys(candidate).slice(0, 12),
    ),
    candidateSummaries: expandedCandidates.map((candidate) => ({
      keys: Object.keys(candidate).slice(0, 12),
      type: getSuggestionType(candidate),
      hasChartSignal: hasChartSignal(candidate),
    })),
  };
}

export function slottedResponses(
  detail: AssistantSlottableRequestDetail,
  chartCatalog: FeatureLayerChartDetail[],
): SlottedChartResponse | null {
  if (detail.name !== "block") {
    return null;
  }

  const payloadCandidates = getDetailPayloadCandidates(detail);
  if (payloadCandidates.length === 0) {
    return null;
  }

  const candidates = payloadCandidates.flatMap((candidate) =>
    getPayloadCandidates(candidate),
  );
  let resolvedPayload: SlottablePayload | null = null;

  for (const candidate of candidates) {
    const suggestionType = getSuggestionType(candidate);
    const isAllowedType =
      suggestionType.length === 0 ||
      suggestionType.toLowerCase() === "chart" ||
      suggestionType.toLowerCase() === "arcgis-chart";
    if (!isAllowedType) {
      continue;
    }
    if (hasChartSignal(candidate)) {
      resolvedPayload = candidate;
      break;
    }
  }

  if (!resolvedPayload) {
    return null;
  }

  const layerItemId = resolveLayerItemId(resolvedPayload, chartCatalog);
  if (!layerItemId) {
    return null;
  }

  const chartIndex =
    toNumberValue(resolvedPayload.chartIndex) ??
    toNumberValue(resolvedPayload["chart-index"]) ??
    0;
  const title =
    toStringValue(resolvedPayload.title) ??
    toStringValue(resolvedPayload.label) ??
    "Map chart";

  return {
    slotName: detail.slotName,
    layerItemId,
    chartIndex,
    title,
  };
}

export function inferChartResponsesFromText(
  detail: AssistantSlottableRequestDetail,
  chartCatalog: FeatureLayerChartDetail[],
): SlottedChartResponse[] {
  if (detail.name !== "block") {
    return [];
  }

  const payloadCandidates = getDetailPayloadCandidates(detail);
  if (payloadCandidates.length === 0) {
    return [];
  }

  const candidates = payloadCandidates.flatMap((candidate) =>
    getPayloadCandidates(candidate),
  );

  const textContent = candidates
    .filter((candidate) => {
      const suggestionType = getSuggestionType(candidate).toLowerCase();
      return suggestionType === "" || suggestionType === "text";
    })
    .flatMap((candidate) => getTextParts(candidate))
    .join(" ")
    .toLowerCase();

  if (textContent.length === 0) {
    return [];
  }

  const matches = chartCatalog.filter(
    (layer) =>
      typeof layer.layerItemId === "string" &&
      layer.layerItemId.length > 0 &&
      Array.isArray(layer.chartIndexes) &&
      layer.chartIndexes.length > 0 &&
      textContent.includes(layer.layerTitle.toLowerCase()),
  );

  const seen = new Set<string>();
  const inferred: SlottedChartResponse[] = [];
  for (const layer of matches) {
    if (!layer.layerItemId || seen.has(layer.layerItemId)) {
      continue;
    }
    seen.add(layer.layerItemId);
    const chartIndex = layer.chartIndexes[0] ?? 0;
    inferred.push({
      slotName: detail.slotName,
      layerItemId: layer.layerItemId,
      chartIndex,
      title: `${layer.layerTitle} · chart ${chartIndex + 1}`,
    });
  }

  return inferred;
}
