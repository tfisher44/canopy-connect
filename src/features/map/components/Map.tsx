import { useEffect, useRef, useState } from "react";
import type Graphic from "@arcgis/core/Graphic";
import esriConfig from "@arcgis/core/config";
import type Point from "@arcgis/core/geometry/Point";
import type Layer from "@arcgis/core/layers/Layer";
import type WebMap from "@arcgis/core/WebMap";
import type MapView from "@arcgis/core/views/MapView";
import type GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import type ListItem from "@arcgis/core/widgets/LayerList/ListItem";
import type { ArcgisMap } from "@arcgis/map-components/components/arcgis-map/customElement";
import type { ArcgisHome } from "@arcgis/map-components/components/arcgis-home/customElement";
import type { ArcgisLayerList } from "@arcgis/map-components/components/arcgis-layer-list/customElement";
import type { ArcgisSearch } from "@arcgis/map-components/components/arcgis-search/customElement";
import type {} from "@arcgis/map-components/types/react";
import { useMapRuntime } from "../../../map/context/MapContext";

const arcgisApiKey = import.meta.env.ARCGIS_API_KEY;
if (typeof arcgisApiKey === "string" && arcgisApiKey.trim().length > 0) {
  esriConfig.apiKey = arcgisApiKey;
}

type ArcgisMapRuntimeTarget = ArcgisMap & {
  map: WebMap | null;
  view: MapView | null;
};

type LayerWithVisibility = {
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

type PointSelectionVisibilitySnapshot = {
  mapView: MapView;
  basemap: WebMap["basemap"] | null;
  layers: LayerVisibilitySnapshot[];
};

function isArcgisMapRuntimeTarget(
  target: EventTarget | null,
): target is ArcgisMapRuntimeTarget {
  return (
    typeof target === "object" &&
    target !== null &&
    "map" in target &&
    "view" in target
  );
}

function getErrorMessage(cause: unknown): string {
  if (cause instanceof Error && cause.message) {
    return cause.message;
  }
  if (typeof cause === "string" && cause.trim().length > 0) {
    return cause;
  }
  return "Failed to load map.";
}

const TREES_WITH_STORIES_LAYER_TITLE = "trees with stories";
const TREE_STORY_OVERLAY_LAYER_ID = "tree-story-workflow-overlay";
const TREE_LAYER_PORTAL_ITEM_ID = "9424d21bd45345ffbd5a1736941ed88d";
const STORIES_TABLE_PORTAL_ITEM_ID = "8c367ee0703d4c6abc010df5a69c8aae";
const IMAGERY_KEYWORDS = ["imagery", "satellite", "aerial", "ortho"];
const DRAFT_TREE_ID_PREFIX = "draft-tree-";
const DRAFT_TREE_MARKER_ICON_URL =
  "https://img.icons8.com/isometric/100/deciduous-tree.png";
const DEFAULT_ZOOM_LEVEL = 5;
const DEFAULT_CENTER = {
  latitude: 37.16611,
  longitude: -120.44944,
};

function isDraftTreeId(treeId: string): boolean {
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

function isStoryEligibleLayer(layer: LayerWithVisibility): boolean {
  return matchesPortalOrLayerId(layer, TREE_LAYER_PORTAL_ITEM_ID);
}

function setLayerVisibility(
  layer: LayerWithVisibility,
  visible: boolean,
): void {
  if (typeof layer.set === "function") {
    layer.set("visible", visible);
    return;
  }
  layer.visible = visible;
}

function capturePointSelectionVisibilitySnapshot(
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

function restorePointSelectionVisibilitySnapshot(
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

async function applyImageryOnlyVisibilityMode(
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

function getAttributeValueByFieldName(
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

function getGlobalIdFieldNameFromLayer(layer: unknown): string | null {
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

function escapeWhereValue(value: string): string {
  return value.replace(/'/g, "''");
}

async function resolveGlobalIdFromGraphic(
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

function setSelectedGlobalIdState(
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

function setNoSelectionState(
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

function logSelectedTreeGraphicProperties(
  graphic: Graphic,
  source: "hitTest" | "popup",
): void {
  const attributes =
    graphic.attributes && typeof graphic.attributes === "object"
      ? (graphic.attributes as Record<string, unknown>)
      : null;
  const layer = graphic.layer as LayerWithVisibility | undefined;
  const extractedTreeId = getTreeIdFromGraphic(graphic);

  // eslint-disable-next-line no-console
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

function logPopupDetails(mapView: MapView): void {
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

  // eslint-disable-next-line no-console
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

function bindSearchToMap(
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

function configureLayerListLegendPanels(
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

function matchesPortalOrLayerId(
  layerLike: unknown,
  expectedId: string,
): boolean {
  if (!layerLike || typeof layerLike !== "object") {
    return false;
  }
  const typed = layerLike as { id?: string; portalItem?: { id?: string } };
  return typed.id === expectedId || typed.portalItem?.id === expectedId;
}

async function logAttachmentCapabilities(mapView: MapView): Promise<void> {
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

  // eslint-disable-next-line no-console
  console.log("[AttachmentCapability] TREE", {
    supportsAttachment:
      treeLayer?.capabilities?.data?.supportsAttachment ?? null,
    hasAttachments: treeLayer?.hasAttachments ?? null,
    supportsAdd: treeLayer?.capabilities?.operations?.supportsAdd ?? null,
    supportsGlobalId:
      treeLayer?.capabilities?.editing?.supportsGlobalId ?? null,
  });

  // eslint-disable-next-line no-console
  console.log("[AttachmentCapability] STORIES", {
    supportsAttachment:
      storiesTable?.capabilities?.data?.supportsAttachment ?? null,
    hasAttachments: storiesTable?.hasAttachments ?? null,
    supportsAdd: storiesTable?.capabilities?.operations?.supportsAdd ?? null,
    supportsGlobalId:
      storiesTable?.capabilities?.editing?.supportsGlobalId ?? null,
  });
}

export function MapPlaceholder() {
  const {
    error,
    mapView,
    selectedTreeId,
    treeSelectionEnabled,
    newTreePlacementEnabled,
    pointSelectionVisibilityModeEnabled,
    draftTreeLocation,
    createdTrees,
    setLoading,
    setReady,
    setError,
    detachMapRuntime,
    setSelectedTreeId,
    setTreeSelectionMessage,
    setDraftTreeLocation,
    setNewTreePlacementMessage,
  } = useMapRuntime();
  const mapElementRef = useRef<ArcgisMap | null>(null);
  const searchElementRef = useRef<ArcgisSearch | null>(null);
  const pointSelectionVisibilitySnapshotRef =
    useRef<PointSelectionVisibilitySnapshot | null>(null);
  const layerListElementRef = useRef<ArcgisLayerList | null>(null);
  const homeElementRef = useRef<ArcgisHome | null>(null);
  const selectedTreeIdRef = useRef<string | null>(selectedTreeId);
  const setSelectedTreeIdRef = useRef(setSelectedTreeId);
  const setTreeSelectionMessageRef = useRef(setTreeSelectionMessage);
  const [componentsReady, setComponentsReady] = useState(
    import.meta.env.MODE === "test",
  );
  const storyLayerVisibilityWatchHandleRef = useRef<{
    remove: () => void;
  } | null>(null);

  useEffect(() => {
    selectedTreeIdRef.current = selectedTreeId;
  }, [selectedTreeId]);

  useEffect(() => {
    setSelectedTreeIdRef.current = setSelectedTreeId;
    setTreeSelectionMessageRef.current = setTreeSelectionMessage;
  }, [setSelectedTreeId, setTreeSelectionMessage]);

  useEffect(() => {
    let isMounted = true;

    const initializeComponents = async () => {
      if (import.meta.env.MODE === "test") {
        return;
      }

      try {
        await Promise.all([
          import("@arcgis/map-components/components/arcgis-map"),
          import("@arcgis/map-components/components/arcgis-layer-list"),
          import("@arcgis/map-components/components/arcgis-fullscreen"),
          import("@arcgis/map-components/components/arcgis-zoom"),
          import("@arcgis/map-components/components/arcgis-search"),
          import("@arcgis/map-components/components/arcgis-home"),
          import("@arcgis/map-components/components/arcgis-legend"),
        ]);
      } catch (cause) {
        if (isMounted) {
          setError({ message: getErrorMessage(cause), cause });
        }
        return;
      }

      if (isMounted) {
        setComponentsReady(true);
      }
    };

    void initializeComponents();

    return () => {
      isMounted = false;
    };
  }, [setError]);

  useEffect(() => {
    if (!componentsReady) {
      return;
    }

    const mapElement = mapElementRef.current;
    if (!mapElement) {
      return;
    }

    bindSearchToMap(mapElement, searchElementRef.current);
    const layerListElement = layerListElementRef.current;
    configureLayerListLegendPanels(layerListElement);
    const searchElement = searchElementRef.current;

    let isMounted = true;
    setLoading();

    const handleViewReady: EventListener = (event) => {
      if (!isMounted) {
        return;
      }

      if (!isArcgisMapRuntimeTarget(event.target)) {
        setError({
          message: "Map runtime failed to initialize.",
          cause: event,
        });
        return;
      }

      const webMap = event.target.map;
      const mapView = event.target.view;
      if (!mapView) {
        return;
      }

      bindSearchToMap(mapElement, searchElementRef.current);
      configureLayerListLegendPanels(layerListElementRef.current);

      mapView.navigation.momentumEnabled = false;
      mapView.constraints = {
        ...mapView.constraints,
        rotationEnabled: false,
      };

      setReady({ webMap, mapView });
    };

    const handleLoadError: EventListener = (event) => {
      setError({ message: getErrorMessage(event), cause: event });
    };

    const handleSearchReady: EventListener = () => {
      if (!isMounted) {
        return;
      }
      bindSearchToMap(mapElement, searchElementRef.current);
    };

    const handleLayerListReady: EventListener = () => {
      if (!isMounted) {
        return;
      }
      configureLayerListLegendPanels(layerListElement);
    };

    mapElement.addEventListener("arcgisViewReadyChange", handleViewReady);
    mapElement.addEventListener("arcgisLoadError", handleLoadError);
    searchElement?.addEventListener("arcgisReady", handleSearchReady);
    layerListElement?.addEventListener("arcgisReady", handleLayerListReady);

    return () => {
      isMounted = false;
      mapElement.removeEventListener("arcgisViewReadyChange", handleViewReady);
      mapElement.removeEventListener("arcgisLoadError", handleLoadError);
      searchElement?.removeEventListener("arcgisReady", handleSearchReady);
      layerListElement?.removeEventListener(
        "arcgisReady",
        handleLayerListReady,
      );
      detachMapRuntime();
    };
    // Mount/unmount lifecycle is intentional for ArcGIS component wiring.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [componentsReady]);

  useEffect(() => {
    if (!mapView?.map) {
      storyLayerVisibilityWatchHandleRef.current?.remove();
      storyLayerVisibilityWatchHandleRef.current = null;
      return;
    }

    const layers = mapView.map.layers.toArray() as LayerWithVisibility[];
    const storyEligibleLayer = layers.find(isStoryEligibleLayer);
    if (!storyEligibleLayer) {
      storyLayerVisibilityWatchHandleRef.current?.remove();
      storyLayerVisibilityWatchHandleRef.current = null;
      return;
    }

    setLayerVisibility(storyEligibleLayer, true);
    storyLayerVisibilityWatchHandleRef.current?.remove();
    storyLayerVisibilityWatchHandleRef.current = null;

    let isDisposed = false;
    void import("@arcgis/core/core/reactiveUtils").then(({ watch }) => {
      if (isDisposed) {
        return;
      }
      const handle = watch(
        () => storyEligibleLayer.visible,
        (visible) => {
          if (visible !== true) {
            setLayerVisibility(storyEligibleLayer, true);
          }
        },
      );
      storyLayerVisibilityWatchHandleRef.current = handle;
    });

    return () => {
      isDisposed = true;
      storyLayerVisibilityWatchHandleRef.current?.remove();
      storyLayerVisibilityWatchHandleRef.current = null;
    };
  }, [mapView]);

  useEffect(() => {
    if (!mapView || !import.meta.env.DEV) {
      return;
    }
    void logAttachmentCapabilities(mapView).catch((cause: unknown) => {
      // eslint-disable-next-line no-console
      console.warn("[AttachmentCapability] Unable to log capabilities", cause);
    });
  }, [mapView]);

  useEffect(() => {
    if (!mapView || !treeSelectionEnabled) {
      return;
    }
    const map = mapView.map;
    if (!map) {
      return;
    }

    const clickHandle = mapView.on("click", (event) => {
      void (async () => {
        const hit = await mapView.hitTest(event, {
          include: map.layers.toArray(),
        });
        const graphicHit = hit.results.find(
          (result) =>
            "graphic" in result &&
            isStoryEligibleLayer(result.graphic.layer as LayerWithVisibility),
        );
        const selectedGraphic =
          graphicHit && "graphic" in graphicHit ? graphicHit.graphic : null;
        const popupGraphic = mapView.popup?.selectedFeature;
        logPopupDetails(mapView);
        const popupSelectedGlobalId = await resolveGlobalIdFromGraphic(
          popupGraphic,
          mapView,
          event.mapPoint ?? null,
        );

        if (!selectedGraphic) {
          if (popupSelectedGlobalId) {
            setSelectedGlobalIdState(
              popupSelectedGlobalId,
              selectedTreeIdRef.current,
              setSelectedTreeIdRef.current,
              setTreeSelectionMessageRef.current,
            );
            return;
          }
          setNoSelectionState(
            selectedTreeIdRef.current,
            setTreeSelectionMessageRef.current,
          );
          return;
        }

        logSelectedTreeGraphicProperties(selectedGraphic, "hitTest");

        const globalId = await resolveGlobalIdFromGraphic(
          selectedGraphic,
          mapView,
          event.mapPoint ?? null,
        );
        if (!globalId) {
          if (popupSelectedGlobalId) {
            setSelectedGlobalIdState(
              popupSelectedGlobalId,
              selectedTreeIdRef.current,
              setSelectedTreeIdRef.current,
              setTreeSelectionMessageRef.current,
            );
            return;
          }
          setNoSelectionState(
            selectedTreeIdRef.current,
            setTreeSelectionMessageRef.current,
            "GlobalID not found. Ensure the layer has Global IDs enabled.",
          );
          return;
        }

        setSelectedGlobalIdState(
          globalId,
          selectedTreeIdRef.current,
          setSelectedTreeIdRef.current,
          setTreeSelectionMessageRef.current,
        );
      })();
    });

    return () => {
      clickHandle.remove();
    };
  }, [mapView, treeSelectionEnabled]);

  useEffect(() => {
    if (!mapView || !treeSelectionEnabled) {
      return;
    }

    let isDisposed = false;
    let popupWatchHandle: { remove: () => void } | null = null;

    const handlePopupSelectedFeatureChange = async (
      feature: Graphic | null | undefined,
    ): Promise<void> => {
      logPopupDetails(mapView);
      const globalId = await resolveGlobalIdFromGraphic(feature, mapView, null);
      if (isDisposed || !globalId) {
        return;
      }
      setSelectedGlobalIdState(
        globalId,
        selectedTreeIdRef.current,
        setSelectedTreeIdRef.current,
        setTreeSelectionMessageRef.current,
      );
    };

    void handlePopupSelectedFeatureChange(
      mapView.popup?.selectedFeature ?? null,
    );

    void import("@arcgis/core/core/reactiveUtils").then(({ watch }) => {
      if (isDisposed) {
        return;
      }
      popupWatchHandle = watch(
        () => mapView.popup?.selectedFeature,
        (feature) => {
          void handlePopupSelectedFeatureChange(feature);
        },
      );
    });

    return () => {
      isDisposed = true;
      popupWatchHandle?.remove();
    };
  }, [mapView, treeSelectionEnabled]);

  useEffect(() => {
    if (!mapView || !newTreePlacementEnabled) {
      return;
    }

    const clickHandle = mapView.on("click", (event) => {
      const mapPoint = event.mapPoint;
      if (!mapPoint) {
        setNewTreePlacementMessage("Unable to read map location from click.");
        return;
      }

      const rawLatitude = mapPoint.latitude;
      const rawLongitude = mapPoint.longitude;
      if (typeof rawLatitude !== "number" || typeof rawLongitude !== "number") {
        setNewTreePlacementMessage(
          "Unable to read map coordinates from click.",
        );
        return;
      }

      const latitude = Number(rawLatitude.toFixed(6));
      const longitude = Number(rawLongitude.toFixed(6));
      setDraftTreeLocation({ latitude, longitude });
      setNewTreePlacementMessage(
        `Tree location set to ${latitude}, ${longitude}.`,
      );
    });

    return () => {
      clickHandle.remove();
    };
  }, [
    mapView,
    newTreePlacementEnabled,
    setDraftTreeLocation,
    setNewTreePlacementMessage,
  ]);

  useEffect(() => {
    if (!mapView) {
      return;
    }

    let isDisposed = false;

    const syncInitialAndHomeZoom = async () => {
      await mapView.goTo(
        {
          center: [DEFAULT_CENTER.longitude, DEFAULT_CENTER.latitude],
          zoom: DEFAULT_ZOOM_LEVEL,
        },
        { animate: false },
      );
      if (isDisposed) {
        return;
      }

      const homeElement = homeElementRef.current;
      if (homeElement) {
        homeElement.viewpoint = mapView.viewpoint.clone();
      }
    };

    void syncInitialAndHomeZoom();

    return () => {
      isDisposed = true;
    };
  }, [mapView]);

  useEffect(() => {
    if (!mapView || !mapView.map || !pointSelectionVisibilityModeEnabled) {
      const snapshot = pointSelectionVisibilitySnapshotRef.current;
      if (snapshot && snapshot.mapView === mapView) {
        restorePointSelectionVisibilitySnapshot(snapshot);
      }
      pointSelectionVisibilitySnapshotRef.current = null;
      return;
    }

    const existingSnapshot = pointSelectionVisibilitySnapshotRef.current;
    if (!existingSnapshot || existingSnapshot.mapView !== mapView) {
      pointSelectionVisibilitySnapshotRef.current =
        capturePointSelectionVisibilitySnapshot(mapView);
    }

    let isDisposed = false;
    void applyImageryOnlyVisibilityMode(mapView, () => isDisposed);

    return () => {
      isDisposed = true;
    };
  }, [mapView, pointSelectionVisibilityModeEnabled]);

  useEffect(() => {
    if (!mapView?.map) {
      return;
    }
    const map = mapView.map;
    let isDisposed = false;
    let overlayLayer: GraphicsLayer | null = null;
    const showDraftTreeMarker =
      draftTreeLocation !== null &&
      (newTreePlacementEnabled ||
        (typeof selectedTreeId === "string" && isDraftTreeId(selectedTreeId)));

    const drawOverlay = async () => {
      const [{ default: GraphicClass }, { default: GraphicsLayerClass }] =
        await Promise.all([
          import("@arcgis/core/Graphic"),
          import("@arcgis/core/layers/GraphicsLayer"),
        ]);
      if (isDisposed) {
        return;
      }

      const existing = map.findLayerById(TREE_STORY_OVERLAY_LAYER_ID);
      if (existing && existing.type === "graphics") {
        overlayLayer = existing as GraphicsLayer;
      } else {
        overlayLayer = new GraphicsLayerClass({
          id: TREE_STORY_OVERLAY_LAYER_ID,
          listMode: "hide",
        });
        map.add(overlayLayer);
      }
      overlayLayer.listMode = "hide";
      overlayLayer.visible = true;

      overlayLayer.removeAll();

      for (const tree of createdTrees.filter(
        (candidate) => !isDraftTreeId(candidate.id),
      )) {
        overlayLayer.add(
          new GraphicClass({
            geometry: {
              type: "point",
              latitude: tree.latitude,
              longitude: tree.longitude,
            },
            symbol: {
              type: "simple-marker",
              style: "circle",
              color: tree.isAlive ? "#34d399" : "#94a3b8",
              outline: {
                color: "#0f172a",
                width: 1.5,
              },
              size: 11,
            },
            attributes: {
              treeId: tree.id,
            },
          }),
        );
      }

      if (showDraftTreeMarker && draftTreeLocation) {
        overlayLayer.add(
          new GraphicClass({
            geometry: {
              type: "point",
              latitude: draftTreeLocation.latitude,
              longitude: draftTreeLocation.longitude,
            },
            symbol: {
              type: "picture-marker",
              url: DRAFT_TREE_MARKER_ICON_URL,
              width: 28,
              height: 28,
              yoffset: 14,
            },
          }),
        );
      }
    };

    void drawOverlay();

    return () => {
      isDisposed = true;
    };
  }, [
    createdTrees,
    draftTreeLocation,
    mapView,
    newTreePlacementEnabled,
    selectedTreeId,
  ]);

  return (
    <section className="map-placeholder" aria-label="Map viewport">
      {error ? <p className="error">{error.message}</p> : null}
      {componentsReady ? (
        <arcgis-map
          id="main-map"
          ref={mapElementRef}
          className="map-placeholder__viewport"
          item-id="20712c612e0149c99d32354f089881c4"
          autoDestroyDisabled={true}
        >
          <arcgis-search
            ref={searchElementRef}
            slot="top-left"
            autoDestroyDisabled={true}
            className="map-placeholder__search"
          />
          <arcgis-home ref={homeElementRef} slot="top-right" />
          <arcgis-zoom slot="top-right" />
          <arcgis-fullscreen slot="top-right" />
          <arcgis-layer-list
            ref={layerListElementRef}
            slot="top-left"
            autoDestroyDisabled={true}
            className="map-placeholder__layer-list"
          />
        </arcgis-map>
      ) : (
        <div
          className="map-placeholder__viewport map-placeholder__viewport--loading"
          role="status"
          aria-live="polite"
        >
          Loading map…
        </div>
      )}
    </section>
  );
}
