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
};

type SetReadyPayload = {
  webMap: WebMap | null;
  mapView: MapView | null;
};

type MapContextValue = MapRuntimeState & {
  setLoading: () => void;
  setReady: (payload: SetReadyPayload) => void;
  setError: (error: MapRuntimeError) => void;
  reset: () => void;
};

type MapRuntimeAction =
  | { type: "SET_LOADING" }
  | { type: "SET_READY"; payload: SetReadyPayload }
  | { type: "SET_ERROR"; payload: MapRuntimeError }
  | { type: "RESET" };

const initialMapRuntimeState: MapRuntimeState = {
  webMap: null,
  mapView: null,
  status: "idle",
  error: null,
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
      };
    case "SET_ERROR":
      return {
        ...state,
        status: "error",
        error: action.payload,
      };
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
