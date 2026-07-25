import { createContext, useContext, useMemo, useReducer } from "react";
import type { PropsWithChildren } from "react";
import type WebMap from "@arcgis/core/WebMap";
import type MapView from "@arcgis/core/views/MapView";

export type MapRuntimeStatus = "idle" | "loading" | "ready" | "error";

export type MapRuntimeError = {
  message: string;
  code?: string;
  cause?: unknown;
};

export type MapRuntimeState = {
  webMap: WebMap | null;
  mapView: MapView | null;
  status: MapRuntimeStatus;
  error: MapRuntimeError | null;
  selectedTreeId: string | null;
  treeSelectionEnabled: boolean;
  treeSelectionMessage: string | null;
  newTreePlacementEnabled: boolean;
  pointSelectionVisibilityModeEnabled: boolean;
  newTreePlacementMessage: string | null;
  draftTreeLocation: {
    latitude: number;
    longitude: number;
  } | null;
  createdTrees: Array<{
    id: string;
    latitude: number;
    longitude: number;
    isAlive: boolean;
  }>;
};

type SetReadyPayload = {
  webMap: WebMap | null;
  mapView: MapView | null;
};

export type LocationSearchResult = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
};

export type CreatedTreeRecord = {
  id: string;
  latitude: number;
  longitude: number;
  isAlive: boolean;
};

type MapContextValue = MapRuntimeState & {
  setLoading: () => void;
  setReady: (payload: SetReadyPayload) => void;
  setError: (error: MapRuntimeError) => void;
  searchLocations: (query: string) => Promise<LocationSearchResult[]>;
  zoomToLocation: (location: LocationSearchResult) => Promise<void>;
  setTreeSelectionEnabled: (enabled: boolean) => void;
  setSelectedTreeId: (treeId: string | null) => void;
  setTreeSelectionMessage: (message: string | null) => void;
  setNewTreePlacementEnabled: (enabled: boolean) => void;
  setPointSelectionVisibilityModeEnabled: (enabled: boolean) => void;
  setDraftTreeLocation: (location: { latitude: number; longitude: number } | null) => void;
  setNewTreePlacementMessage: (message: string | null) => void;
  addCreatedTree: (tree: CreatedTreeRecord) => void;
  reset: () => void;
};

type MapRuntimeAction =
  | { type: "SET_LOADING" }
  | { type: "SET_READY"; payload: SetReadyPayload }
  | { type: "SET_ERROR"; payload: MapRuntimeError }
  | { type: "SET_TREE_SELECTION_ENABLED"; payload: boolean }
  | { type: "SET_SELECTED_TREE_ID"; payload: string | null }
  | { type: "SET_TREE_SELECTION_MESSAGE"; payload: string | null }
  | { type: "SET_NEW_TREE_PLACEMENT_ENABLED"; payload: boolean }
  | { type: "SET_POINT_SELECTION_VISIBILITY_MODE_ENABLED"; payload: boolean }
  | {
      type: "SET_DRAFT_TREE_LOCATION";
      payload: { latitude: number; longitude: number } | null;
    }
  | { type: "SET_NEW_TREE_PLACEMENT_MESSAGE"; payload: string | null }
  | { type: "ADD_CREATED_TREE"; payload: CreatedTreeRecord }
  | { type: "RESET" };

const GEOCODER_URL = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer";

const initialMapRuntimeState: MapRuntimeState = {
  webMap: null,
  mapView: null,
  status: "idle",
  error: null,
  selectedTreeId: null,
  treeSelectionEnabled: false,
  treeSelectionMessage: null,
  newTreePlacementEnabled: false,
  pointSelectionVisibilityModeEnabled: false,
  newTreePlacementMessage: null,
  draftTreeLocation: null,
  createdTrees: [],
};

function mapRuntimeReducer(state: MapRuntimeState, action: MapRuntimeAction): MapRuntimeState {
  switch (action.type) {
    case "SET_LOADING":
      return {
        ...state,
        status: "loading",
        error: null,
      };
    case "SET_READY":
      return {
        webMap: action.payload.webMap,
        mapView: action.payload.mapView,
        status: "ready",
        error: null,
        selectedTreeId: state.selectedTreeId,
        treeSelectionEnabled: state.treeSelectionEnabled,
        treeSelectionMessage: state.treeSelectionMessage,
        newTreePlacementEnabled: state.newTreePlacementEnabled,
        pointSelectionVisibilityModeEnabled: state.pointSelectionVisibilityModeEnabled,
        newTreePlacementMessage: state.newTreePlacementMessage,
        draftTreeLocation: state.draftTreeLocation,
        createdTrees: state.createdTrees,
      };
    case "SET_ERROR":
      return {
        ...state,
        status: "error",
        error: action.payload,
      };
    case "SET_TREE_SELECTION_ENABLED":
      if (
        state.treeSelectionEnabled === action.payload &&
        (action.payload || (state.selectedTreeId === null && state.treeSelectionMessage === null))
      ) {
        return state;
      }
      return {
        ...state,
        treeSelectionEnabled: action.payload,
        selectedTreeId: action.payload ? state.selectedTreeId : null,
        treeSelectionMessage: action.payload
          ? "Click a story-eligible tree on the map to continue."
          : null,
      };
    case "SET_SELECTED_TREE_ID":
      if (state.selectedTreeId === action.payload) {
        return state;
      }
      return {
        ...state,
        selectedTreeId: action.payload,
      };
    case "SET_TREE_SELECTION_MESSAGE":
      if (state.treeSelectionMessage === action.payload) {
        return state;
      }
      return {
        ...state,
        treeSelectionMessage: action.payload,
      };
    case "SET_NEW_TREE_PLACEMENT_ENABLED":
      if (
        state.newTreePlacementEnabled === action.payload &&
        (action.payload || (state.newTreePlacementMessage === null && state.draftTreeLocation === null))
      ) {
        return state;
      }
      return {
        ...state,
        newTreePlacementEnabled: action.payload,
        draftTreeLocation: action.payload ? state.draftTreeLocation : null,
        newTreePlacementMessage: action.payload
          ? "Click the map to place your new tree."
          : null,
      };
    case "SET_POINT_SELECTION_VISIBILITY_MODE_ENABLED":
      if (state.pointSelectionVisibilityModeEnabled === action.payload) {
        return state;
      }
      return {
        ...state,
        pointSelectionVisibilityModeEnabled: action.payload,
      };
    case "SET_DRAFT_TREE_LOCATION":
      if (
        state.draftTreeLocation?.latitude === action.payload?.latitude &&
        state.draftTreeLocation?.longitude === action.payload?.longitude
      ) {
        return state;
      }
      return {
        ...state,
        draftTreeLocation: action.payload,
      };
    case "SET_NEW_TREE_PLACEMENT_MESSAGE":
      if (state.newTreePlacementMessage === action.payload) {
        return state;
      }
      return {
        ...state,
        newTreePlacementMessage: action.payload,
      };
    case "ADD_CREATED_TREE": {
      const nextTrees = [
        ...state.createdTrees.filter((tree) => tree.id !== action.payload.id),
        action.payload,
      ];
      return {
        ...state,
        createdTrees: nextTrees,
      };
    }
    case "RESET":
      return initialMapRuntimeState;
    default:
      return state;
  }
}

const MapContext = createContext<MapContextValue | undefined>(undefined);

export function MapProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(mapRuntimeReducer, initialMapRuntimeState);

  const value = useMemo<MapContextValue>(
    () => ({
      ...state,
      setLoading() {
        dispatch({ type: "SET_LOADING" });
      },
      setReady(payload) {
        dispatch({ type: "SET_READY", payload });
      },
      setError(error) {
        dispatch({ type: "SET_ERROR", payload: error });
      },
      async searchLocations(query) {
        const trimmedQuery = query.trim();
        if (!trimmedQuery) {
          return [];
        }
        if (!state.mapView) {
          throw new Error("Map is not ready for location search.");
        }

        const locator = await import("@arcgis/core/rest/locator");
        const candidates = await locator.addressToLocations(GEOCODER_URL, {
          address: { SingleLine: trimmedQuery },
          maxLocations: 6,
          outFields: ["LongLabel"],
        });

        const results: LocationSearchResult[] = [];
        for (const candidate of candidates) {
          const location = candidate.location;
          const latitude = location?.latitude;
          const longitude = location?.longitude;
          if (typeof latitude !== "number" || typeof longitude !== "number") {
            continue;
          }

          const attributes = candidate.attributes as Record<string, unknown> | undefined;
          const longLabel = attributes?.LongLabel;
          const addressValue = candidate.address;
          const label =
            typeof longLabel === "string" && longLabel.trim().length > 0
              ? longLabel
              : typeof addressValue === "string" && addressValue.trim().length > 0
                ? addressValue
                : "Unnamed location";

          results.push({
            id: `${longitude}:${latitude}:${label}`,
            label,
            latitude,
            longitude,
          });
        }

        return results;
      },
      async zoomToLocation(location) {
        if (!state.mapView) {
          throw new Error("Map is not ready for navigation.");
        }
        await state.mapView.goTo(
          {
            center: [location.longitude, location.latitude],
            zoom: 16,
          },
          { duration: 650 },
        );
      },
      setTreeSelectionEnabled(enabled) {
        dispatch({ type: "SET_TREE_SELECTION_ENABLED", payload: enabled });
      },
      setSelectedTreeId(treeId) {
        dispatch({ type: "SET_SELECTED_TREE_ID", payload: treeId });
      },
      setTreeSelectionMessage(message) {
        dispatch({ type: "SET_TREE_SELECTION_MESSAGE", payload: message });
      },
      setNewTreePlacementEnabled(enabled) {
        dispatch({ type: "SET_NEW_TREE_PLACEMENT_ENABLED", payload: enabled });
      },
      setPointSelectionVisibilityModeEnabled(enabled) {
        dispatch({
          type: "SET_POINT_SELECTION_VISIBILITY_MODE_ENABLED",
          payload: enabled,
        });
      },
      setDraftTreeLocation(location) {
        dispatch({ type: "SET_DRAFT_TREE_LOCATION", payload: location });
      },
      setNewTreePlacementMessage(message) {
        dispatch({ type: "SET_NEW_TREE_PLACEMENT_MESSAGE", payload: message });
      },
      addCreatedTree(tree) {
        dispatch({ type: "ADD_CREATED_TREE", payload: tree });
      },
      reset() {
        dispatch({ type: "RESET" });
      },
    }),
    [state],
  );

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMapRuntime() {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error("useMapRuntime must be used within MapProvider.");
  }

  return context;
}
