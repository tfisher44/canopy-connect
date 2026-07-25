import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { StoryProvider } from "../features/intake/model/StoryContext";
import { MapProvider } from "../map/context/MapContext";
import { ThemeProvider } from "../theme/ThemeContext";
import { App } from "./App";

describe("App", () => {
  it("renders the single-page shell with panel collapsed by default", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ThemeProvider>
          <MapProvider>
            <StoryProvider>
              <App />
            </StoryProvider>
          </MapProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Canopy Connect" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open panel" })).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Workflow panel" })).not.toBeInTheDocument();
  });

  it("keeps legacy route compatibility while rendering the same shell", () => {
    render(
      <MemoryRouter initialEntries={["/map"]}>
        <ThemeProvider>
          <MapProvider>
            <StoryProvider>
              <App />
            </StoryProvider>
          </MapProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(screen.getAllByRole("heading", { name: "Canopy Connect" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("region", { name: "Map workspace" }).length).toBeGreaterThan(0);
  });
});
