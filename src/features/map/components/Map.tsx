import { useEffect, useRef, useState } from "react";
import type Graphic from "@arcgis/core/Graphic";
import esriConfig from "@arcgis/core/config";
import type GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import type { ArcgisMap } from "@arcgis/map-components/components/arcgis-map/customElement";
import type { ArcgisHome } from "@arcgis/map-components/components/arcgis-home/customElement";
import type { ArcgisLayerList } from "@arcgis/map-components/components/arcgis-layer-list/customElement";
import type { ArcgisSearch } from "@arcgis/map-components/components/arcgis-search/customElement";
import type {} from "@arcgis/map-components/types/react";
import { useMapRuntime } from "../../../map/context/MapContext";
import {
  applyImageryOnlyVisibilityMode,
  bindSearchToMap,
  buildTreeAuthorFilterExpression,
  capturePointSelectionVisibilitySnapshot,
  configureLayerListLegendPanels,
  DEFAULT_CENTER,
  DEFAULT_ZOOM_LEVEL,
  DRAFT_TREE_MARKER_ICON_URL,
  escapeWhereValue,
  findFeatureLayerByPortalOrLayerId,
  findFieldNameIgnoreCase,
  getAttributeValueByFieldName,
  getErrorMessage,
  getGlobalIdFieldNameFromLayer,
  isArcgisMapRuntimeTarget,
  isDraftTreeId,
  isStoryEligibleLayer,
  logAttachmentCapabilities,
  logPopupDetails,
  logSelectedTreeGraphicProperties,
  resolveGlobalIdFromGraphic,
  restorePointSelectionVisibilitySnapshot,
  setLayerVisibility,
  setNoSelectionState,
  setSelectedGlobalIdState,
  STORIES_TABLE_PORTAL_ITEM_ID,
  TREE_LAYER_PORTAL_ITEM_ID,
  TREE_STORY_OVERLAY_LAYER_ID,
} from "./mapHelpers";
import type {
  LayerWithVisibility,
  PointSelectionVisibilitySnapshot,
} from "./mapHelpers";

const arcgisApiKey = import.meta.env.ARCGIS_API_KEY;
if (typeof arcgisApiKey === "string" && arcgisApiKey.trim().length > 0) {
  esriConfig.apiKey = arcgisApiKey;
}

const DEFAULT_WEBMAP_ID = "20712c612e0149c99d32354f089881c4";

type MapPlaceholderProps = {
  mapItemId?: string;
};

export function MapPlaceholder({ mapItemId = DEFAULT_WEBMAP_ID }: MapPlaceholderProps) {
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
  const [findMyTreesExpanded, setFindMyTreesExpanded] = useState(false);
  const [authorFilterInput, setAuthorFilterInput] = useState("");
  const [authorFilterStatusMessage, setAuthorFilterStatusMessage] = useState<
    string | null
  >(null);
  const [authorFilterLoading, setAuthorFilterLoading] = useState(false);
  const [authorFilterApplied, setAuthorFilterApplied] = useState(false);
  const initialTreeDefinitionExpressionRef = useRef<string | null>(null);
  const storyLayerVisibilityWatchHandleRef = useRef<{
    remove: () => void;
  } | null>(null);

  const applyAuthorTreeFilter = async (): Promise<void> => {
    const authorName = authorFilterInput.trim();
    if (!authorName) {
      setAuthorFilterStatusMessage("Enter an author name to find trees.");
      return;
    }
    if (!mapView) {
      setAuthorFilterStatusMessage("Map is not ready yet.");
      return;
    }

    setAuthorFilterLoading(true);
    setAuthorFilterStatusMessage(`Finding trees for "${authorName}"...`);

    try {
      const treeLayer = findFeatureLayerByPortalOrLayerId(
        mapView,
        TREE_LAYER_PORTAL_ITEM_ID,
      );
      if (!treeLayer) {
        throw new Error("Tree layer was not found.");
      }

      const storiesTable = findFeatureLayerByPortalOrLayerId(
        mapView,
        STORIES_TABLE_PORTAL_ITEM_ID,
      );
      if (!storiesTable) {
        throw new Error("Story table was not found.");
      }

      await Promise.all([treeLayer.load(), storiesTable.load()]);

      if (initialTreeDefinitionExpressionRef.current === null) {
        initialTreeDefinitionExpressionRef.current =
          typeof treeLayer.definitionExpression === "string"
            ? treeLayer.definitionExpression
            : null;
      }

      const storyAuthorField = findFieldNameIgnoreCase(storiesTable.fields, [
        "author_name",
        "authorName",
        "author",
        "name",
      ]);
      const storyTreeIdField = findFieldNameIgnoreCase(storiesTable.fields, [
        "tree_global_id",
        "treeGlobalId",
        "tree_id",
        "treeid",
      ]);
      if (!storyAuthorField || !storyTreeIdField) {
        throw new Error(
          "Story table fields for author and tree id were not found.",
        );
      }

      const query = storiesTable.createQuery();
      query.where = `UPPER(${storyAuthorField}) LIKE '%${escapeWhereValue(authorName.toUpperCase())}%'`;
      query.outFields = [storyTreeIdField];
      query.returnGeometry = false;

      const storyMatches = await storiesTable.queryFeatures({
        where: query.where,
        outFields: query.outFields,
        returnGeometry: query.returnGeometry,
        num: query.num,
      });

      const matchedTreeGlobalIds = Array.from(
        new Set(
          (storyMatches.features ?? [])
            .map((feature) =>
              getAttributeValueByFieldName(
                feature.attributes,
                storyTreeIdField,
              ),
            )
            .filter(
              (value): value is string =>
                typeof value === "string" && value.trim().length > 0,
            ),
        ),
      );

      const treeGlobalIdField =
        (typeof treeLayer.globalIdField === "string" &&
        treeLayer.globalIdField.trim().length > 0
          ? treeLayer.globalIdField
          : null) ??
        getGlobalIdFieldNameFromLayer(treeLayer) ??
        findFieldNameIgnoreCase(treeLayer.fields, ["globalid"]);

      if (!treeGlobalIdField) {
        throw new Error("Tree GlobalID field was not found.");
      }

      treeLayer.definitionExpression = buildTreeAuthorFilterExpression(
        treeGlobalIdField,
        matchedTreeGlobalIds,
        initialTreeDefinitionExpressionRef.current,
      );

      if (matchedTreeGlobalIds.length === 0) {
        setAuthorFilterStatusMessage(
          `No trees found for author "${authorName}".`,
        );
      } else {
        setAuthorFilterStatusMessage(
          `Showing ${matchedTreeGlobalIds.length} tree${matchedTreeGlobalIds.length === 1 ? "" : "s"} for author "${authorName}".`,
        );
      }
      setAuthorFilterApplied(true);
    } catch (cause) {
      setAuthorFilterStatusMessage(
        cause instanceof Error
          ? cause.message
          : "Unable to filter trees by author.",
      );
    } finally {
      setAuthorFilterLoading(false);
    }
  };

  const clearAuthorTreeFilter = (): void => {
    if (!mapView) {
      setAuthorFilterStatusMessage("Map is not ready yet.");
      return;
    }

    const treeLayer = findFeatureLayerByPortalOrLayerId(
      mapView,
      TREE_LAYER_PORTAL_ITEM_ID,
    );
    if (!treeLayer) {
      setAuthorFilterStatusMessage("Tree layer was not found.");
      return;
    }

    treeLayer.definitionExpression =
      initialTreeDefinitionExpressionRef.current ?? undefined;
    setAuthorFilterApplied(false);
    setAuthorFilterStatusMessage("Tree author filter cleared.");
    setFindMyTreesExpanded(false);
  };

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
    return () => {
      if (!mapView) {
        return;
      }
      const treeLayer = findFeatureLayerByPortalOrLayerId(
        mapView,
        TREE_LAYER_PORTAL_ITEM_ID,
      );
      if (!treeLayer) {
        return;
      }
      treeLayer.definitionExpression =
        initialTreeDefinitionExpressionRef.current ?? undefined;
    };
  }, [mapView]);

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
          item-id={mapItemId}
          autoDestroyDisabled={true}
        >
          <arcgis-search
            ref={searchElementRef}
            slot="top-left"
            autoDestroyDisabled={true}
            className="map-placeholder__search"
          />
          <div slot="top-left" className="map-placeholder__find-my-trees">
            <button
              type="button"
              className="button button--ghost"
              onClick={() => {
                setFindMyTreesExpanded((current) => !current);
              }}
            >
              Find my Trees
            </button>
            {findMyTreesExpanded ? (
              <div className="map-placeholder__find-my-trees-panel">
                <label
                  htmlFor="find-my-trees-author"
                  className="map-placeholder__find-my-trees-label"
                >
                  Author name
                </label>
                <input
                  id="find-my-trees-author"
                  className="map-placeholder__find-my-trees-input"
                  type="text"
                  value={authorFilterInput}
                  onChange={(event) => {
                    setAuthorFilterInput(event.currentTarget.value);
                  }}
                  placeholder="Enter author name"
                  disabled={authorFilterLoading}
                />
                <div className="map-placeholder__find-my-trees-actions">
                  <button
                    type="button"
                    className="button"
                    disabled={
                      authorFilterLoading || authorFilterInput.trim().length === 0
                    }
                    onClick={() => {
                      void applyAuthorTreeFilter();
                    }}
                  >
                    {authorFilterLoading ? "Finding..." : "Apply"}
                  </button>
                  <button
                    type="button"
                    className="button button--ghost"
                    disabled={authorFilterLoading || !authorFilterApplied}
                    onClick={clearAuthorTreeFilter}
                  >
                    Clear
                  </button>
                </div>
                {authorFilterStatusMessage ? (
                  <p
                    className="map-placeholder__find-my-trees-status"
                    role="status"
                    aria-live="polite"
                  >
                    {authorFilterStatusMessage}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          <arcgis-home ref={homeElementRef} slot="top-right" />
          <arcgis-zoom slot="top-right" />
          <arcgis-fullscreen slot="top-right" />
          <arcgis-layer-list
            ref={layerListElementRef}
            slot="bottom-left"
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
          Loading map...
        </div>
      )}
    </section>
  );
}
