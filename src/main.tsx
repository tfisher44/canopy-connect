import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { defineCustomElements as defineCalciteCustomElements } from "@esri/calcite-components/loader";
import { App } from "./app/App";
import { StoryProvider } from "./features/intake/model/StoryContext";
import { MapProvider } from "./map/context/MapContext";
import { ThemeProvider } from "./theme/ThemeContext";
import "./index.css";
import "@esri/calcite-components/main.css";
import "@arcgis/map-components/main.css";

const bootstrapFlags = globalThis as { __calciteCustomElementsDefined__?: boolean };

if (!bootstrapFlags.__calciteCustomElementsDefined__) {
  defineCalciteCustomElements(window);
  bootstrapFlags.__calciteCustomElementsDefined__ = true;
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
