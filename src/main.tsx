import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import { StoryProvider } from "./features/intake/model/StoryContext";
import { MapProvider } from "./map/context/MapContext";
import "./index.css";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <MapProvider>
        <StoryProvider>
          <App />
        </StoryProvider>
      </MapProvider>
    </BrowserRouter>
  </StrictMode>,
)
