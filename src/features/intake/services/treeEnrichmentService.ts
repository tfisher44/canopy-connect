import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import type Geometry from "@arcgis/core/geometry/Geometry";
import type Point from "@arcgis/core/geometry/Point";
import type Layer from "@arcgis/core/layers/Layer";
import type MapView from "@arcgis/core/views/MapView";

export type PolygonEnrichmentRule = {
  layerId: string;
  enabled?: boolean;
  where?: string;
  fieldMappings: Array<{
    sourceField: string;
    targetField: string;
  }>;
};

export type RasterEnrichmentRule = {
  layerId: string;
  enabled?: boolean;
  identifyOptions?: Record<string, unknown>;
  fieldMappings: Array<{
    sourceField?: string;
    targetField: string;
  }>;
};

export type TreeEnrichmentConfig = {
  polygonRules: PolygonEnrichmentRule[];
  rasterRules: RasterEnrichmentRule[];
  strict?: boolean;
};

// Configure enrichment here: map source layer fields to target tree-layer fields.
export const treeEnrichmentConfig: TreeEnrichmentConfig = {
  polygonRules: [
    // Example:
    // {
    //   layerId: "polygon-layer-id",
    //   enabled: true,
    //   fieldMappings: [
    //     { sourceField: "ZONE_NAME", targetField: "zone_name" },
    //   ],
    // },
  ],
  rasterRules: [
    {
      layerId: "b925374111cc4809b0f4fc47d2c9a07e",
      enabled: true,
      fieldMappings: [{ targetField: "CanopyCover" }],
    },
    {
      layerId: "528164b1d64b44d997068efa34482cb9",
      enabled: true,
      fieldMappings: [{ targetField: "WildfireHazardPotential" }],
    },
    {
      layerId: "e7df45c175314a10acf351d61cec80ce",
      enabled: true,
      fieldMappings: [{ targetField: "VulnerabilityToChange" }],
    },
    {
      layerId: "ae7b7eff1dca4268ba567af17150f5e8",
      enabled: true,
      fieldMappings: [{ targetField: "PestsAndPathogens" }],
    },
  ],
  strict: false,
};

function normalizeLayerId(layerId: string): string {
  return layerId.trim();
}

function getLayerById(mapView: MapView, layerId: string): Layer {
  const normalizedLayerId = normalizeLayerId(layerId);
  const map = mapView.map;
  if (!map) {
    throw new Error("Map is not ready.");
  }

  const foundLayer = map.allLayers.find((layer) => {
    const typedLayer = layer as { id?: string; portalItem?: { id?: string } };
    return (
      typedLayer.id === normalizedLayerId ||
      typedLayer.portalItem?.id === normalizedLayerId
    );
  });

  if (!foundLayer) {
    throw new Error(`Layer "${normalizedLayerId}" was not found in the map.`);
  }

  return foundLayer;
}

function asFeatureLayer(layer: Layer, layerId: string): FeatureLayer {
  if (layer.type !== "feature") {
    throw new Error(`Layer "${layerId}" is not a feature layer.`);
  }
  return layer as FeatureLayer;
}

function extractRasterAttributes(
  identifyResult: unknown,
): Record<string, unknown> {
  if (!identifyResult || typeof identifyResult !== "object") {
    return {};
  }

  const typedResult = identifyResult as Record<string, unknown>;

  const rawResults = typedResult.results;
  if (Array.isArray(rawResults) && rawResults.length > 0) {
    const typedRawResults = rawResults as unknown[];
    const firstResult = typedRawResults[0];
    if (firstResult && typeof firstResult === "object") {
      const typedFirstResult = firstResult as Record<string, unknown>;
      const resultAttributes = typedFirstResult.attributes;
      if (resultAttributes && typeof resultAttributes === "object") {
        return resultAttributes as Record<string, unknown>;
      }
      if ("value" in typedFirstResult) {
        return {
          ServicePixelValue: typedFirstResult.value,
          Value: typedFirstResult.value,
        };
      }
    }
  }

  const directAttributes = typedResult.attributes;
  if (directAttributes && typeof directAttributes === "object") {
    return directAttributes as Record<string, unknown>;
  }

  const valueObject = typedResult.value;
  if (valueObject && typeof valueObject === "object") {
    return valueObject as Record<string, unknown>;
  }

  if ("value" in typedResult) {
    return { Value: typedResult.value };
  }

  return {};
}

function normalizeMappedValueForTreeField(value: unknown): string | null {
  if (value === null || typeof value === "undefined") {
    return null;
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  return null;
}

function getPrimaryRasterCellValueWithKey(
  sourceAttributes: Record<string, unknown>,
): {
  key: string | null;
  value: unknown;
} {
  const preferredKeys = ["ServicePixelValue", "Value", "value"];
  for (const key of preferredKeys) {
    if (key in sourceAttributes) {
      return {
        key,
        value: sourceAttributes[key],
      };
    }
  }

  const firstKey = Object.keys(sourceAttributes)[0];
  if (!firstKey) {
    return {
      key: null,
      value: undefined,
    };
  }

  return {
    key: firstKey,
    value: sourceAttributes[firstKey],
  };
}

async function queryPolygonRule(
  mapView: MapView,
  point: Point,
  rule: PolygonEnrichmentRule,
): Promise<Record<string, unknown>> {
  const layer = asFeatureLayer(
    getLayerById(mapView, rule.layerId),
    rule.layerId,
  );
  await layer.load();

  const queryCapabilities = layer.capabilities?.query as
    { supportsSpatialQuery?: boolean } | undefined;
  if (queryCapabilities?.supportsSpatialQuery === false) {
    throw new Error(
      `Layer "${rule.layerId}" does not support spatial query.`,
    );
  }

  const query = layer.createQuery();
  query.geometry = point;
  query.spatialRelationship = "intersects";
  query.returnGeometry = false;
  query.outFields = [
    ...new Set(rule.fieldMappings.map((mapping) => mapping.sourceField)),
  ];
  query.num = 1;
  if (rule.where) {
    query.where = rule.where;
  }

  const result = await layer.queryFeatures(query);
  const feature = result.features.at(0);
  const sourceAttributes =
    feature?.attributes && typeof feature.attributes === "object"
      ? (feature.attributes as Record<string, unknown>)
      : {};

  const updates: Record<string, unknown> = {};
  for (const mapping of rule.fieldMappings) {
    if (mapping.sourceField in sourceAttributes) {
      updates[mapping.targetField] = normalizeMappedValueForTreeField(
        sourceAttributes[mapping.sourceField],
      );
    }
  }

  return updates;
}

async function queryRasterRule(
  mapView: MapView,
  point: Point,
  rule: RasterEnrichmentRule,
): Promise<Record<string, unknown>> {
  const layer = getLayerById(mapView, rule.layerId) as Layer & {
    identify?: (
      geometry: Geometry,
      options?: Record<string, unknown>,
    ) => Promise<unknown>;
  };

  if (typeof layer.identify !== "function") {
    throw new Error(`Layer "${rule.layerId}" does not expose identify().`);
  }

  const identifyResult = await layer.identify(point, {
    returnGeometry: false,
    ...rule.identifyOptions,
  });
  const sourceAttributes = extractRasterAttributes(identifyResult);

  const updates: Record<string, unknown> = {};
  for (const mapping of rule.fieldMappings) {
    if (mapping.sourceField && mapping.sourceField in sourceAttributes) {
      updates[mapping.targetField] = normalizeMappedValueForTreeField(
        sourceAttributes[mapping.sourceField],
      );
      continue;
    }

    const primaryValue = getPrimaryRasterCellValueWithKey(sourceAttributes);
    updates[mapping.targetField] = normalizeMappedValueForTreeField(
      primaryValue.value,
    );

    if (import.meta.env.DEV) {
      const requestedField = mapping.sourceField ?? "(none)";
      const resolvedKey = primaryValue.key ?? "(none)";
      // Dev-only trace to verify which identify result value was mapped.
      console.info(
        `[treeEnrichment] Raster layer ${rule.layerId}: requested source field ${requestedField}, resolved key ${resolvedKey}, target field ${mapping.targetField}`,
        { value: primaryValue.value },
      );
    }
  }

  return updates;
}

export async function enrichTreeAttributesFromMap(
  mapView: MapView,
  latitude: number,
  longitude: number,
  baseAttributes: Record<string, unknown>,
  config: TreeEnrichmentConfig = treeEnrichmentConfig,
): Promise<Record<string, unknown>> {
  const { default: PointClass } = await import("@arcgis/core/geometry/Point");
  const point = new PointClass({
    latitude,
    longitude,
    spatialReference: { wkid: 4326 },
  });

  const updates: Record<string, unknown> = {};

  for (const rule of config.polygonRules) {
    if (rule.enabled === false) {
      continue;
    }

    try {
      Object.assign(updates, await queryPolygonRule(mapView, point, rule));
    } catch (cause) {
      if (config.strict) {
        throw cause;
      }
    }
  }

  for (const rule of config.rasterRules) {
    if (rule.enabled === false) {
      continue;
    }

    try {
      Object.assign(updates, await queryRasterRule(mapView, point, rule));
    } catch (cause) {
      if (config.strict) {
        throw cause;
      }
    }
  }

  return {
    ...baseAttributes,
    ...updates,
  };
}
