import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { defineCustomElements as defineCalciteCustomElements } from "@esri/calcite-components/loader";
import { defineCustomElements as defineArcgisChartsCustomElements } from "@arcgis/charts-components/loader";
import { defineCustomElements as defineArcgisAiCustomElements } from "@arcgis/ai-components/loader";
import { App } from "./app/App";
import { StoryProvider } from "./features/intake/model/StoryContext";
import { MapProvider } from "./map/context/MapContext";
import { ThemeProvider } from "./theme/ThemeContext";
import "./index.css";
import "@esri/calcite-components/main.css";
import "@arcgis/map-components/main.css";
import "@arcgis/charts-components/main.css";
import "@arcgis/ai-components/main.css";

const bootstrapFlags = globalThis as {
  __calciteCustomElementsDefined__?: boolean;
  __arcgisChartsCustomElementsDefined__?: boolean;
  __arcgisAiCustomElementsDefined__?: boolean;
};

if (!bootstrapFlags.__calciteCustomElementsDefined__) {
  defineCalciteCustomElements(window);
  bootstrapFlags.__calciteCustomElementsDefined__ = true;
}

if (!bootstrapFlags.__arcgisChartsCustomElementsDefined__) {
  defineArcgisChartsCustomElements(window);
  bootstrapFlags.__arcgisChartsCustomElementsDefined__ = true;
}

if (!bootstrapFlags.__arcgisAiCustomElementsDefined__) {
  defineArcgisAiCustomElements(window);
  bootstrapFlags.__arcgisAiCustomElementsDefined__ = true;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <MapProvider>
          <StoryProvider>
            <App />
          </StoryProvider>
        </MapProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
