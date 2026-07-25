import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import { StoryProvider } from "./features/intake/model/StoryContext";
import "./index.css";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <StoryProvider>
        <App />
      </StoryProvider>
    </BrowserRouter>
  </StrictMode>,
)
