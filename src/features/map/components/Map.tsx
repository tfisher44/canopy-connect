import { useEffect, useRef, useState } from "react";
import type WebMap from "@arcgis/core/WebMap";
import type MapView from "@arcgis/core/views/MapView";
import type { ArcgisMap } from "@arcgis/map-components/components/arcgis-map/customElement";
import type {} from "@arcgis/map-components/types/react";
import { useMapRuntime } from "../../../map/context/MapContext";

type ArcgisMapRuntimeTarget = ArcgisMap & {
  map: WebMap | null;
  view: MapView | null;
};

function isArcgisMapRuntimeTarget(target: EventTarget | null): target is ArcgisMapRuntimeTarget {
  return typeof target === "object" && target !== null && "map" in target && "view" in target;
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

export function MapPlaceholder() {
  const { error, setLoading, setReady, setError, reset } = useMapRuntime();
  const mapElementRef = useRef<ArcgisMap | null>(null);
  const [componentsReady, setComponentsReady] = useState(import.meta.env.MODE === "test");

  useEffect(() => {
    let isMounted = true;

    const initializeComponents = async () => {
      if (import.meta.env.MODE === "test") {
        return;
      }

      try {
        await import("@arcgis/map-components/main.css");
      } catch {
        const stylesheetId = "arcgis-map-components-theme";
        if (!document.getElementById(stylesheetId)) {
          const stylesheet = document.createElement("link");
          stylesheet.id = stylesheetId;
          stylesheet.rel = "stylesheet";
          stylesheet.href = "https://js.arcgis.com/5.1/arcgis-map-components/arcgis-map-components.css";
          document.head.appendChild(stylesheet);
        }
      }

      try {
        await Promise.all([
          import("@arcgis/map-components/components/arcgis-map/customElement"),
          import("@arcgis/map-components/components/arcgis-layer-list/customElement"),
          import("@arcgis/map-components/components/arcgis-fullscreen/customElement"),
          import("@arcgis/map-components/components/arcgis-zoom/customElement"),
          import("@arcgis/map-components/components/arcgis-search/customElement"),
          import("@arcgis/map-components/components/arcgis-locate/customElement"),
          import("@arcgis/map-components/components/arcgis-home/customElement"),
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

    let isMounted = true;
    setLoading();

    const handleViewReady: EventListener = (event) => {
      if (!isMounted) {
        return;
      }

      if (!isArcgisMapRuntimeTarget(event.target)) {
        setError({ message: "Map runtime failed to initialize.", cause: event });
        return;
      }

      const webMap = event.target.map;
      const mapView = event.target.view;
      if (!mapView) {
        return;
      }

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

    mapElement.addEventListener("arcgisViewReadyChange", handleViewReady);
    mapElement.addEventListener("arcgisLoadError", handleLoadError);

    return () => {
      isMounted = false;
      mapElement.removeEventListener("arcgisViewReadyChange", handleViewReady);
      mapElement.removeEventListener("arcgisLoadError", handleLoadError);
      reset();
    };
    // Mount/unmount lifecycle is intentional for ArcGIS component wiring.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [componentsReady]);


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
          <arcgis-search slot="top-left" />
          <arcgis-layer-list slot="bottom-left" />
          <arcgis-home slot="top-right" />
          <arcgis-locate slot="top-right" />
          <arcgis-zoom slot="top-right" />
          <arcgis-fullscreen slot="top-right" />
        </arcgis-map>
      ) : (
        <div className="map-placeholder__viewport map-placeholder__viewport--loading" role="status" aria-live="polite">
          Loading map…
        </div>
      )}
    </section>
  );
}
