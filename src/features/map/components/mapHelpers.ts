import type Graphic from "@arcgis/core/Graphic";
import type Point from "@arcgis/core/geometry/Point";
import type Layer from "@arcgis/core/layers/Layer";
import type WebMap from "@arcgis/core/WebMap";
import type MapView from "@arcgis/core/views/MapView";
import type ListItem from "@arcgis/core/widgets/LayerList/ListItem";
import type { ArcgisMap } from "@arcgis/map-components/components/arcgis-map/customElement";
import type { ArcgisLayerList } from "@arcgis/map-components/components/arcgis-layer-list/customElement";
import type { ArcgisSearch } from "@arcgis/map-components/components/arcgis-search/customElement";

export type ArcgisMapRuntimeTarget = ArcgisMap & {
  map: WebMap | null;
  view: MapView | null;
};

export type LayerWithVisibility = {
  id?: string;
  type?: string;
  title?: string;
  visible?: boolean;
  portalItem?: {
    title?: string;
    id?: string;
  };
  set?: (propertyName: "visible", value: boolean) => void;
};

type LayerVisibilitySnapshot = {
  layer: LayerWithVisibility;
  visible: boolean;
};

type QueryableLayer = {
  objectIdField?: string;
  fields?: Array<{ name?: string; alias?: string }>;
  queryFeatures: (query: {
    where: string;
    outFields: string[];
    returnGeometry: boolean;
    geometry?: unknown;
    spatialRelationship?: string;
    num?: number;
  }) => Promise<{
    features?: Array<{
      attributes?: unknown;
    }>;
  }>;
};

type QueryableLayerView = {
  queryFeatures: (query: {
    where: string;
    outFields: string[];
    returnGeometry: boolean;
    geometry?: unknown;
    spatialRelationship?: string;
    num?: number;
  }) => Promise<{
    features?: Array<{
      attributes?: unknown;
    }>;
  }>;
};

export type FilterableFeatureLayer = Layer & {
  type?: string;
  fields?: Array<{ name?: string; alias?: string }>;
  globalIdField?: string;
  definitionExpression?: string;
  load: () => Promise<unknown>;
  createQuery: () => {
    where?: string;
    outFields?: string[];
    returnGeometry?: boolean;
    num?: number;
  };
  queryFeatures: (query: {
    where: string;
    outFields: string[];
    returnGeometry: boolean;
    num?: number;
  }) => Promise<{
    features?: Array<{
      attributes?: unknown;
    }>;
  }>;
};

export type PointSelectionVisibilitySnapshot = {
  mapView: MapView;
  basemap: WebMap["basemap"] | null;
  layers: LayerVisibilitySnapshot[];
};

export const TREES_WITH_STORIES_LAYER_TITLE = "trees with stories";
export const TREE_STORY_OVERLAY_LAYER_ID = "tree-story-workflow-overlay";
export const TREE_LAYER_PORTAL_ITEM_ID = "9424d21bd45345ffbd5a1736941ed88d";
export const STORIES_TABLE_PORTAL_ITEM_ID = "8c367ee0703d4c6abc010df5a69c8aae";
const IMAGERY_KEYWORDS = ["imagery", "satellite", "aerial", "ortho"];
export const DRAFT_TREE_ID_PREFIX = "draft-tree-";
export const DRAFT_TREE_MARKER_ICON_URL =
  "https://img.icons8.com/isometric/100/deciduous-tree.png";
export const DEFAULT_ZOOM_LEVEL = 5;
export const DEFAULT_CENTER = {
  latitude: 37.16611,
  longitude: -120.44944,
};

export function isArcgisMapRuntimeTarget(
  target: EventTarget | null,
): target is ArcgisMapRuntimeTarget {
  return (
    typeof target === "object" &&
    target !== null &&
    "map" in target &&
    "view" in target
  );
}

export function getErrorMessage(cause: unknown): string {
  if (cause instanceof Error && cause.message) {
    return cause.message;
  }
  if (typeof cause === "string" && cause.trim().length > 0) {
    return cause;
  }
  return "Failed to load map.";
}

export function isDraftTreeId(treeId: string): boolean {
  return treeId.startsWith(DRAFT_TREE_ID_PREFIX);
}

function getBasemapLayers(mapView: MapView): LayerWithVisibility[] {
  const baseLayers = mapView.map?.basemap?.baseLayers?.toArray() ?? [];
  const referenceLayers =
    mapView.map?.basemap?.referenceLayers?.toArray() ?? [];
  return [...baseLayers, ...referenceLayers] as LayerWithVisibility[];
}

function getLayerSearchText(layer: LayerWithVisibility): string {
  const values = [layer.id, layer.title, layer.portalItem?.title]
    .filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    )
    .map((value) => value.toLowerCase());
  return values.join(" ");
}

function isImageryLayer(layer: LayerWithVisibility): boolean {
  const typeName =
    typeof layer.type === "string" ? layer.type.toLowerCase() : "";
  if (typeName.includes("imagery")) {
    return true;
  }
  const searchText = getLayerSearchText(layer);
  return IMAGERY_KEYWORDS.some((keyword) => searchText.includes(keyword));
}

export function isStoryEligibleLayer(layer: LayerWithVisibility): boolean {
  return matchesPortalOrLayerId(layer, TREE_LAYER_PORTAL_ITEM_ID);
}

export function setLayerVisibility(
  layer: LayerWithVisibility,
  visible: boolean,
): void {
  if (typeof layer.set === "function") {
    layer.set("visible", visible);
    return;
  }
  layer.visible = visible;
}

export function capturePointSelectionVisibilitySnapshot(
  mapView: MapView,
): PointSelectionVisibilitySnapshot {
  const map = mapView.map;
  const basemap = map?.basemap ?? null;
  const layers = [
    ...getBasemapLayers(mapView),
    ...((map?.layers.toArray() as LayerWithVisibility[]) ?? []),
  ].map((layer) => ({
    layer,
    visible: layer.visible === true,
  }));
  return { mapView, basemap, layers };
}

export function restorePointSelectionVisibilitySnapshot(
  snapshot: PointSelectionVisibilitySnapshot,
): void {
  const map = snapshot.mapView.map;
  if (!map) {
    return;
  }

  if (snapshot.basemap) {
    map.basemap = snapshot.basemap;
  }

  snapshot.layers.forEach(({ layer, visible }) => {
    setLayerVisibility(layer, visible);
  });
}

export async function applyImageryOnlyVisibilityMode(
  mapView: MapView,
  isDisposed: () => boolean,
): Promise<void> {
  const map = mapView.map;
  if (!map) {
    return;
  }

  const basemapLayers = getBasemapLayers(mapView);
  const operationalLayers = map.layers.toArray() as LayerWithVisibility[];
  const imageryLayers = [...basemapLayers, ...operationalLayers].filter(
    isImageryLayer,
  );
  const activeImageryLayers = imageryLayers.filter(
    (layer) => layer.visible === true,
  );

  if (activeImageryLayers.length > 0) {
    activeImageryLayers.forEach((layer) => {
      setLayerVisibility(layer, true);
    });
  } else {
    const fallbackImageryLayer = basemapLayers.find(isImageryLayer);
    if (fallbackImageryLayer) {
      setLayerVisibility(fallbackImageryLayer, true);
    } else {
      const { default: Basemap } = await import("@arcgis/core/Basemap");
      if (isDisposed()) {
        return;
      }
      const defaultImageryBasemap = Basemap.fromId("satellite");
      if (defaultImageryBasemap) {
        map.basemap = defaultImageryBasemap;
        getBasemapLayers(mapView)
          .filter(isImageryLayer)
          .forEach((layer) => {
            setLayerVisibility(layer, true);
          });
      }
    }
  }

  operationalLayers.forEach((layer) => {
    if (layer.id === TREE_STORY_OVERLAY_LAYER_ID) {
      setLayerVisibility(layer, true);
      return;
    }
    if (isStoryEligibleLayer(layer)) {
      setLayerVisibility(layer, true);
      return;
    }
    if (!isImageryLayer(layer)) {
      setLayerVisibility(layer, false);
    }
  });
}

function normalizeFieldToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function coerceFieldValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

export function getAttributeValueByFieldName(
  attributes: unknown,
  fieldName: string | null | undefined,
): string | null {
  if (!fieldName || !attributes || typeof attributes !== "object") {
    return null;
  }

  const typedAttributes = attributes as Record<string, unknown>;
  const directValue = coerceFieldValue(typedAttributes[fieldName]);
  if (directValue) {
    return directValue;
  }

  const normalizedFieldName = normalizeFieldToken(fieldName);
  for (const [key, value] of Object.entries(typedAttributes)) {
    if (normalizeFieldToken(key) !== normalizedFieldName) {
      continue;
    }
    const coercedValue = coerceFieldValue(value);
    if (coercedValue) {
      return coercedValue;
    }
  }

  return null;
}

export function getGlobalIdFieldNameFromLayer(layer: unknown): string | null {
  if (!layer || typeof layer !== "object") {
    return null;
  }

  const fields = (layer as QueryableLayer).fields;
  if (!Array.isArray(fields)) {
    return null;
  }

  for (const field of fields) {
    if (!field || typeof field !== "object") {
      continue;
    }

    const fieldName = typeof field.name === "string" ? field.name : null;
    const fieldAlias = typeof field.alias === "string" ? field.alias : null;
    const normalizedName = fieldName ? normalizeFieldToken(fieldName) : "";
    const normalizedAlias = fieldAlias ? normalizeFieldToken(fieldAlias) : "";

    if (normalizedName === "globalid" || normalizedAlias === "globalid") {
      return fieldName;
    }
  }

  return null;
}

function getGlobalIdFromAttributes(
  attributes: unknown,
  preferredGlobalIdFieldName?: string | null,
): string | null {
  const preferredFieldValue = getAttributeValueByFieldName(
    attributes,
    preferredGlobalIdFieldName,
  );
  if (preferredFieldValue) {
    return preferredFieldValue;
  }

  if (!attributes || typeof attributes !== "object") {
    return null;
  }
  const typedAttributes = attributes as Record<string, unknown>;

  const directGlobalId = coerceFieldValue(typedAttributes.GlobalID);
  if (directGlobalId) {
    return directGlobalId;
  }

  return getAttributeValueByFieldName(attributes, "GlobalID");
}

function getTreeIdFromGraphic(graphic: Graphic): string | null {
  return getGlobalIdFromAttributes(graphic.attributes as unknown);
}

function isQueryableLayer(layer: unknown): layer is QueryableLayer {
  return (
    typeof layer === "object" &&
    layer !== null &&
    "queryFeatures" in layer &&
    typeof (layer as QueryableLayer).queryFeatures === "function"
  );
}

function isQueryableLayerView(
  layerView: unknown,
): layerView is QueryableLayerView {
  return (
    typeof layerView === "object" &&
    layerView !== null &&
    "queryFeatures" in layerView &&
    typeof (layerView as QueryableLayerView).queryFeatures === "function"
  );
}

function getObjectIdFromAttributes(
  attributes: unknown,
  objectIdField?: string,
): string | number | null {
  if (!attributes || typeof attributes !== "object") {
    return null;
  }
  const typedAttributes = attributes as Record<string, unknown>;
  const keys = [
    objectIdField,
    "OBJECTID",
    "ObjectId",
    "objectid",
    "FID",
    "fid",
    "id",
  ].filter(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );
  for (const key of keys) {
    const value = typedAttributes[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

export function escapeWhereValue(value: string): string {
  return value.replace(/'/g, "''");
}

function isFilterableFeatureLayer(layer: unknown): layer is FilterableFeatureLayer {
  return (
    typeof layer === "object" &&
    layer !== null &&
    (layer as { type?: string }).type === "feature" &&
    typeof (layer as FilterableFeatureLayer).load === "function" &&
    typeof (layer as FilterableFeatureLayer).createQuery === "function" &&
    typeof (layer as FilterableFeatureLayer).queryFeatures === "function"
  );
}

export function findFeatureLayerByPortalOrLayerId(
  mapView: MapView,
  targetId: string,
): FilterableFeatureLayer | null {
  const map = mapView.map;
  if (!map) {
    return null;
  }

  const fromLayers = map.allLayers.find((layer) =>
    matchesPortalOrLayerId(layer, targetId),
  );
  if (isFilterableFeatureLayer(fromLayers)) {
    return fromLayers;
  }

  const mapWithTables = map as unknown as {
    allTables?: { toArray?: () => unknown[] };
    tables?: { toArray?: () => unknown[] };
  };
  const tableSources = [
    mapWithTables.allTables?.toArray?.() ?? [],
    mapWithTables.tables?.toArray?.() ?? [],
  ];

  for (const source of tableSources) {
    const found = source.find((candidate) =>
      matchesPortalOrLayerId(candidate, targetId),
    );
    if (isFilterableFeatureLayer(found)) {
      return found;
    }
  }

  return null;
}

export function findFieldNameIgnoreCase(
  fields: Array<{ name?: string; alias?: string }> | undefined,
  candidates: string[],
): string | null {
  if (!Array.isArray(fields) || fields.length === 0) {
    return null;
  }

  const normalizedCandidates = candidates.map(normalizeFieldToken);
  for (const field of fields) {
    const name = typeof field.name === "string" ? field.name : null;
    const alias = typeof field.alias === "string" ? field.alias : null;
    const normalizedName = name ? normalizeFieldToken(name) : "";
    const normalizedAlias = alias ? normalizeFieldToken(alias) : "";
    if (
      normalizedCandidates.includes(normalizedName) ||
      normalizedCandidates.includes(normalizedAlias)
    ) {
      return name;
    }
  }

  return null;
}

export function buildTreeAuthorFilterExpression(
  treeGlobalIdField: string,
  treeGlobalIds: string[],
  baseExpression: string | null,
): string {
  if (treeGlobalIds.length === 0) {
    return baseExpression && baseExpression.trim().length > 0
      ? `(${baseExpression}) AND (1=0)`
      : "1=0";
  }

  const globalIdList = treeGlobalIds
    .map((value) => `'${escapeWhereValue(value)}'`)
    .join(", ");
  const authorFilter = `${treeGlobalIdField} IN (${globalIdList})`;
  return baseExpression && baseExpression.trim().length > 0
    ? `(${baseExpression}) AND (${authorFilter})`
    : authorFilter;
}

export async function resolveGlobalIdFromGraphic(
  graphic: Graphic | null | undefined,
  mapView?: MapView | null,
  fallbackGeometry?: Point | null,
): Promise<string | null> {
  if (!graphic) {
    return null;
  }
  const layer = graphic.layer;
  if (!layer) {
    return null;
  }
  const preferredGlobalIdFieldName = getGlobalIdFieldNameFromLayer(layer);
  const directGlobalId = getGlobalIdFromAttributes(
    graphic.attributes as unknown,
    preferredGlobalIdFieldName,
  );
  if (directGlobalId) {
    return directGlobalId;
  }

  if (isQueryableLayer(layer)) {
    const objectIdField =
      typeof layer.objectIdField === "string" &&
      layer.objectIdField.trim().length > 0
        ? layer.objectIdField
        : "OBJECTID";
    const objectId = getObjectIdFromAttributes(
      graphic.attributes as unknown,
      objectIdField,
    );
    if (objectId !== null) {
      const where =
        typeof objectId === "number"
          ? `${objectIdField} = ${objectId}`
          : `${objectIdField} = '${escapeWhereValue(objectId)}'`;
      const response = await layer.queryFeatures({
        where,
        outFields: ["*"],
        returnGeometry: false,
        num: 1,
      });
      const queriedAttributes = response.features?.[0]?.attributes;
      const queriedGlobalId = getGlobalIdFromAttributes(
        queriedAttributes,
        preferredGlobalIdFieldName,
      );
      if (queriedGlobalId) {
        return queriedGlobalId;
      }
    }
  }

  if (!mapView) {
    return null;
  }

  const layerViewCandidate = await mapView.whenLayerView(layer as Layer);
  if (!isQueryableLayerView(layerViewCandidate)) {
    return null;
  }

  const geometry = graphic.geometry ?? fallbackGeometry ?? null;
  if (!geometry) {
    return null;
  }

  const viewResponse = await layerViewCandidate.queryFeatures({
    where: "1=1",
    geometry,
    spatialRelationship: "intersects",
    outFields: ["*"],
    returnGeometry: false,
    num: 1,
  });
  return getGlobalIdFromAttributes(
    viewResponse.features?.[0]?.attributes,
    preferredGlobalIdFieldName,
  );
}

export function setSelectedGlobalIdState(
  globalId: string,
  selectedTreeId: string | null,
  setSelectedTreeId: (treeId: string | null) => void,
  setTreeSelectionMessage: (message: string) => void,
): void {
  if (selectedTreeId !== globalId) {
    setSelectedTreeId(globalId);
  }
  setTreeSelectionMessage(`Selected tree global ID: ${globalId}.`);
}

export function setNoSelectionState(
  selectedTreeId: string | null,
  setTreeSelectionMessage: (message: string) => void,
  noSelectionMessage = `No tree selected. Click a point on "${TREES_WITH_STORIES_LAYER_TITLE}".`,
): void {
  if (selectedTreeId) {
    setTreeSelectionMessage(
      `Selected tree global ID: ${selectedTreeId}. Click another point on "${TREES_WITH_STORIES_LAYER_TITLE}" to change it.`,
    );
    return;
  }

  setTreeSelectionMessage(noSelectionMessage);
}

export function logSelectedTreeGraphicProperties(
  graphic: Graphic,
  source: "hitTest" | "popup",
): void {
  const attributes =
    graphic.attributes && typeof graphic.attributes === "object"
      ? (graphic.attributes as Record<string, unknown>)
      : null;
  const layer = graphic.layer as LayerWithVisibility | undefined;
  const extractedTreeId = getTreeIdFromGraphic(graphic);

  console.info("[TreeSelectionDebug] selected feature", {
    layer,
    source,
    layerId: layer?.id ?? null,
    layerTitle: layer?.title ?? layer?.portalItem?.title ?? null,
    extractedTreeId,
    attributes,
    attributeKeys: attributes ? Object.keys(attributes) : [],
  });
}

export function logPopupDetails(mapView: MapView): void {
  const popup = mapView.popup;
  const selectedFeature = popup?.selectedFeature;
  const layer = selectedFeature?.layer as
    | (LayerWithVisibility & {
        fields?: Array<{ name?: string; alias?: string; type?: string }>;
      })
    | undefined;
  const attributes =
    selectedFeature?.attributes &&
    typeof selectedFeature.attributes === "object"
      ? (selectedFeature.attributes as Record<string, unknown>)
      : null;
  const layerFields = Array.isArray(layer?.fields)
    ? layer.fields.map((field) => ({
        name: field.name ?? null,
        alias: field.alias ?? null,
        type: field.type ?? null,
      }))
    : [];

  console.info("[TreeSelectionDebug] popup details", {
    selectedFeatureExists: Boolean(selectedFeature),
    visible: popup?.visible ?? null,
    title: popup?.title ?? null,
    selectedFeatureLayerId: layer?.id ?? null,
    selectedFeatureLayerTitle: layer?.title ?? layer?.portalItem?.title ?? null,
    selectedFeatureAttributes: attributes,
    selectedFeatureAttributeKeys: attributes ? Object.keys(attributes) : [],
    layerFields,
  });
}

export function bindSearchToMap(
  mapElement: ArcgisMap,
  searchElement: ArcgisSearch | null,
): void {
  if (!searchElement) {
    return;
  }

  searchElement.referenceElement = mapElement;
  if (mapElement.view) {
    searchElement.view = mapElement.view;
  }
}

export function configureLayerListLegendPanels(
  layerListElement: ArcgisLayerList | null,
): void {
  if (!layerListElement) {
    return;
  }

  layerListElement.listItemCreatedFunction = (event: { item: ListItem }) => {
    event.item.panel = {
      content: "legend",
      open: false,
    };
  };
}

export function matchesPortalOrLayerId(
  layerLike: unknown,
  expectedId: string,
): boolean {
  if (!layerLike || typeof layerLike !== "object") {
    return false;
  }
  const typed = layerLike as { id?: string; portalItem?: { id?: string } };
  return typed.id === expectedId || typed.portalItem?.id === expectedId;
}

export async function logAttachmentCapabilities(mapView: MapView): Promise<void> {
  const map = mapView.map;
  if (!map) {
    return;
  }

  const treeLayerCandidate = map.allLayers.find((layer) =>
    matchesPortalOrLayerId(layer, TREE_LAYER_PORTAL_ITEM_ID),
  );

  const mapWithTables = map as unknown as {
    allTables?: { toArray?: () => unknown[] };
  };
  const tables = mapWithTables.allTables?.toArray?.() ?? [];
  const storiesTableCandidate = tables.find((table) =>
    matchesPortalOrLayerId(table, STORIES_TABLE_PORTAL_ITEM_ID),
  );

  const treeLayer = treeLayerCandidate as Layer & {
    load?: () => Promise<unknown>;
    hasAttachments?: boolean;
    capabilities?: {
      data?: { supportsAttachment?: boolean };
      operations?: { supportsAdd?: boolean };
      editing?: { supportsGlobalId?: boolean };
    };
  };
  const storiesTable = storiesTableCandidate as Layer & {
    load?: () => Promise<unknown>;
    hasAttachments?: boolean;
    capabilities?: {
      data?: { supportsAttachment?: boolean };
      operations?: { supportsAdd?: boolean };
      editing?: { supportsGlobalId?: boolean };
    };
  };

  await Promise.all([treeLayer?.load?.(), storiesTable?.load?.()]);

  console.log("[AttachmentCapability] TREE", {
    supportsAttachment:
      treeLayer?.capabilities?.data?.supportsAttachment ?? null,
    hasAttachments: treeLayer?.hasAttachments ?? null,
    supportsAdd: treeLayer?.capabilities?.operations?.supportsAdd ?? null,
    supportsGlobalId:
      treeLayer?.capabilities?.editing?.supportsGlobalId ?? null,
  });

  console.log("[AttachmentCapability] STORIES", {
    supportsAttachment:
      storiesTable?.capabilities?.data?.supportsAttachment ?? null,
    hasAttachments: storiesTable?.hasAttachments ?? null,
    supportsAdd: storiesTable?.capabilities?.operations?.supportsAdd ?? null,
    supportsGlobalId:
      storiesTable?.capabilities?.editing?.supportsGlobalId ?? null,
  });
}
