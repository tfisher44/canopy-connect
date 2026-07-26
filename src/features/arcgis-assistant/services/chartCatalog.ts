import type MapView from "@arcgis/core/views/MapView";

type FeatureLayerWithCharts = {
  id?: string;
  title?: string;
  type?: string;
  charts?: unknown[] | null;
  portalItem?: {
    id?: string;
    title?: string;
  };
  load?: () => Promise<unknown>;
};

export type FeatureLayerChartMetadata = {
  chartIndex: number;
  title: string | null;
  description: string | null;
};

export type FeatureLayerChartDetail = {
  layerId: string | null;
  layerTitle: string;
  layerItemId: string | null;
  chartCount: number;
  chartIndexes: number[];
  layerRef: unknown;
  chartModels: unknown[];
  chartMetadata: FeatureLayerChartMetadata[];
};

function isFeatureLayerWithCharts(layer: unknown): layer is FeatureLayerWithCharts {
  if (!layer || typeof layer !== "object") {
    return false;
  }

  const typedLayer = layer as FeatureLayerWithCharts;
  return typedLayer.type === "feature";
}

function getLayerTitle(layer: FeatureLayerWithCharts): string {
  const titleCandidates = [layer.title, layer.portalItem?.title];
  for (const candidate of titleCandidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }
  return "Untitled feature layer";
}

function toTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function extractTextValue(value: unknown, depth = 0): string | null {
  if (depth > 2) {
    return null;
  }

  const direct = toTrimmedString(value);
  if (direct) {
    return direct;
  }

  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const directText =
    toTrimmedString(record.text) ??
    toTrimmedString(record.label) ??
    toTrimmedString(record.value) ??
    toTrimmedString(record.name);
  if (directText) {
    return directText;
  }

  return (
    extractTextValue(record.content, depth + 1) ??
    extractTextValue(record.textInfo, depth + 1) ??
    extractTextValue(record.symbol, depth + 1)
  );
}

function buildChartMetadata(
  chart: unknown,
  chartIndex: number,
): FeatureLayerChartMetadata {
  const chartRecord = asRecord(chart);
  const title =
    extractTextValue(chartRecord?.title) ??
    extractTextValue(chartRecord?.name);
  const subtitle = extractTextValue(chartRecord?.subtitle);
  const description =
    extractTextValue(chartRecord?.description) ??
    subtitle;

  return {
    chartIndex,
    title,
    description,
  };
}

export async function getFeatureLayerChartDetails(
  mapView: MapView,
): Promise<FeatureLayerChartDetail[]> {
  const map = mapView.map;
  if (!map) {
    return [];
  }

  const operationalLayers = map.allLayers?.toArray() ?? map.layers.toArray();
  const tableLayers = map.tables?.toArray() ?? [];
  const layers = [...operationalLayers, ...tableLayers];
  const chartDetails: FeatureLayerChartDetail[] = [];
  const seenLayerKeys = new Set<string>();

  for (const layer of layers) {
    if (!isFeatureLayerWithCharts(layer)) {
      continue;
    }

    const layerKey =
      (typeof layer.id === "string" && layer.id.length > 0
        ? `id:${layer.id}`
        : null) ??
      (typeof layer.portalItem?.id === "string" && layer.portalItem.id.length > 0
        ? `portal:${layer.portalItem.id}`
        : null) ??
      `title:${getLayerTitle(layer)}`;

    if (seenLayerKeys.has(layerKey)) {
      continue;
    }
    seenLayerKeys.add(layerKey);

    if (typeof layer.load === "function") {
      await layer.load();
    }

    const charts = Array.isArray(layer.charts) ? layer.charts : [];
    if (charts.length === 0) {
      continue;
    }

    chartDetails.push({
      layerId: typeof layer.id === "string" ? layer.id : null,
      layerTitle: getLayerTitle(layer),
      layerItemId:
        typeof layer.portalItem?.id === "string" ? layer.portalItem.id : null,
      chartCount: charts.length,
      chartIndexes: charts.map((_, index) => index),
      layerRef: layer,
      chartModels: charts,
      chartMetadata: charts.map((chart, index) => buildChartMetadata(chart, index)),
    });
  }

  return chartDetails;
}
