import { useEffect, useRef, useState } from "react";
import type WebMap from "@arcgis/core/WebMap";
import type MapView from "@arcgis/core/views/MapView";
import type { ArcgisMap } from "@arcgis/map-components/components/arcgis-map/customElement";
import type {} from "@arcgis/map-components/types/react";
import { useMapRuntime } from "../../../map/context/MapContext";

export function MapPlaceholder() {
  const { error, setReady, setError, reset } = useMapRuntime();
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

      await Promise.all([
        import("@arcgis/map-components/components/arcgis-map/customElement"),
        import("@arcgis/map-components/components/arcgis-layer-list/customElement"),
        import("@arcgis/map-components/components/arcgis-fullscreen/customElement"),
        import("@arcgis/map-components/components/arcgis-zoom/customElement"),
        import("@arcgis/map-components/components/arcgis-search/customElement"),
        import("@arcgis/map-components/components/arcgis-locate/customElement"),
      ]);

      if (isMounted) {
        setComponentsReady(true);
      }
    };

    void initializeComponents();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!componentsReady) {
      return;
    }

    const mapElement = mapElementRef.current;
    if (!mapElement) {
      return;
    }

    let isMounted = true;

    const handleViewReady = () => {
      if (!isMounted) {
        return;
      }

      const componentWithView = mapElement as HTMLElement & {
        map: WebMap | null;
        view: MapView | null;
      };
      const webMap = componentWithView.map;
      const mapView = componentWithView.view;
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

    const handleLoadError = (event: Event) => {
      const message = event instanceof ErrorEvent && event.message ? event.message : "Failed to load map.";
      setError({ message, cause: event });
    };

    mapElement.addEventListener("arcgisViewReadyChange", handleViewReady as EventListener);
    mapElement.addEventListener("arcgisLoadError", handleLoadError as EventListener);

    return () => {
      isMounted = false;
      mapElement.removeEventListener("arcgisViewReadyChange", handleViewReady as EventListener);
      mapElement.removeEventListener("arcgisLoadError", handleLoadError as EventListener);
      reset();
    };
    // Mount/unmount lifecycle is intentional for ArcGIS component wiring.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [componentsReady]);


  return (
    <section className="panel stack" aria-labelledby="map-title">
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
          <arcgis-locate slot="top-left" />
          <arcgis-layer-list slot="bottom-left" />
          <arcgis-fullscreen slot="top-right" />
          <arcgis-zoom slot="top-right" />
        </arcgis-map>
      ) : (
        <div className="map-placeholder__viewport" role="status" aria-live="polite" />
      )}
    </section>
  );
}

