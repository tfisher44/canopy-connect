import { useEffect, useRef, useState } from "react";
import type Graphic from "@arcgis/core/Graphic";
import esriConfig from "@arcgis/core/config";
import type WebMap from "@arcgis/core/WebMap";
import type MapView from "@arcgis/core/views/MapView";
import type GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import type ListItem from "@arcgis/core/widgets/LayerList/ListItem";
import type { ArcgisMap } from "@arcgis/map-components/components/arcgis-map/customElement";
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
  };
  set?: (propertyName: "visible", value: boolean) => void;
};

type LayerVisibilitySnapshot = {
  layer: LayerWithVisibility;
  visible: boolean;
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

const STORY_ELIGIBLE_TREE_LAYER_ID = "story-eligible-trees";
const TREE_STORY_OVERLAY_LAYER_ID = "tree-story-workflow-overlay";
const IMAGERY_KEYWORDS = ["imagery", "satellite", "aerial", "ortho"];
const DRAFT_TREE_MARKER_ICON_URL =
  "https://img.icons8.com/isometric/100/deciduous-tree.png";

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
    if (!isImageryLayer(layer)) {
      setLayerVisibility(layer, false);
    }
  });
}

function getTreeIdFromGraphic(graphic: Graphic): string | null {
  const attributes = graphic.attributes as unknown;
  if (!attributes || typeof attributes !== "object") {
    return null;
  }
  const typedAttributes = attributes as Record<string, unknown>;

  const keys = ["treeId", "tree_id", "id", "OBJECTID", "ObjectId"] as const;
  for (const key of keys) {
    const value = typedAttributes[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return null;
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

export function MapPlaceholder() {
  const {
    error,
    mapView,
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
  const [componentsReady, setComponentsReady] = useState(
    import.meta.env.MODE === "test",
  );

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
    configureLayerListLegendPanels(layerListElementRef.current);
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
      const boundedExtent = mapView.extent?.clone();
      if (boundedExtent) {
        boundedExtent.expand(2);
        mapView.constraints = {
          ...mapView.constraints,
          geometry: boundedExtent,
          rotationEnabled: false,
        };
      }

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
      configureLayerListLegendPanels(layerListElementRef.current);
    };

    mapElement.addEventListener("arcgisViewReadyChange", handleViewReady);
    mapElement.addEventListener("arcgisLoadError", handleLoadError);
    searchElement?.addEventListener("arcgisReady", handleSearchReady);
    layerListElementRef.current?.addEventListener(
      "arcgisReady",
      handleLayerListReady,
    );

    return () => {
      isMounted = false;
      mapElement.removeEventListener("arcgisViewReadyChange", handleViewReady);
      mapElement.removeEventListener("arcgisLoadError", handleLoadError);
      searchElement?.removeEventListener("arcgisReady", handleSearchReady);
      layerListElementRef.current?.removeEventListener(
        "arcgisReady",
        handleLayerListReady,
      );
      detachMapRuntime();
    };
    // Mount/unmount lifecycle is intentional for ArcGIS component wiring.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [componentsReady]);

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
            result.graphic.layer?.id === STORY_ELIGIBLE_TREE_LAYER_ID &&
            getTreeIdFromGraphic(result.graphic) !== null,
        );

        if (!graphicHit || !("graphic" in graphicHit)) {
          setSelectedTreeId(null);
          setTreeSelectionMessage(
            `No story-eligible tree selected. Click a tree on layer "${STORY_ELIGIBLE_TREE_LAYER_ID}".`,
          );
          return;
        }

        const treeId = getTreeIdFromGraphic(graphicHit.graphic);
        if (!treeId) {
          setSelectedTreeId(null);
          setTreeSelectionMessage(
            "Selected feature is missing a valid tree id.",
          );
          return;
        }

        setSelectedTreeId(treeId);
        setTreeSelectionMessage(`Selected tree ${treeId}.`);
      })();
    });

    return () => {
      clickHandle.remove();
    };
  }, [
    mapView,
    setSelectedTreeId,
    setTreeSelectionMessage,
    treeSelectionEnabled,
  ]);

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
        });
        map.add(overlayLayer);
      }
      overlayLayer.visible = true;

      overlayLayer.removeAll();

      for (const tree of createdTrees) {
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

      if (draftTreeLocation) {
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
  }, [createdTrees, draftTreeLocation, mapView]);

  return (
    <section className="map-placeholder" aria-label="Map viewport">
      {error ? <p className="error">{error.message}</p> : null}
      {componentsReady ? (
        <arcgis-map
          ref={mapElementRef}
          className="map-placeholder__viewport"
          item-id="20712c612e0149c99d32354f089881c4"
          center={[-119.44944, 37.16611]}
          zoom={5}
          autoDestroyDisabled={true}
        >
          <arcgis-search
            ref={searchElementRef}
            slot="top-left"
            autoDestroyDisabled={true}
            className="map-placeholder__search"
          />
          <arcgis-layer-list
            ref={layerListElementRef}
            slot="top-left"
            autoDestroyDisabled={true}
            className="map-placeholder__layer-list"
          />
          <arcgis-home slot="top-right" />
          <arcgis-zoom slot="top-right" />
          <arcgis-fullscreen slot="top-right" />
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
