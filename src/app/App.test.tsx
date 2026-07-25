import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { StoryProvider } from "../features/intake/model/StoryContext";
import { MapProvider } from "../map/context/MapContext";
import { App } from "./App";

describe("App", () => {
  it("renders the single-page shell with panel collapsed by default", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <MapProvider>
          <StoryProvider>
            <App />
          </StoryProvider>
        </MapProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Canopy Connect" })).toBeInTheDocument();
    expect(screen.getByText("Runtime status: idle")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open panel" })).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Workflow panel" })).not.toBeInTheDocument();
  });

  it("keeps legacy route compatibility while rendering the same shell", () => {
    render(
      <MemoryRouter initialEntries={["/map"]}>
        <MapProvider>
          <StoryProvider>
            <App />
          </StoryProvider>
        </MapProvider>
      </MemoryRouter>,
    );

    expect(screen.getAllByRole("heading", { name: "Canopy Connect" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("region", { name: "Map workspace" }).length).toBeGreaterThan(0);
  });
});
