import { useMapRuntime } from "../context/MapContext";

export function useMapView() {
  return useMapRuntime();
}
