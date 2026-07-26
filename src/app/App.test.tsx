import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link } from "react-router-dom";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { StoryProvider } from "../features/intake/model/StoryContext";
import { MapProvider, useMapRuntime } from "../map/context/MapContext";
import { ThemeProvider } from "../theme/ThemeContext";
import { App } from "./App";

describe("App", () => {
  function RuntimeProbe() {
    const runtime = useMapRuntime();
    const locationLabel = runtime.draftTreeLocation
      ? `${runtime.draftTreeLocation.latitude}, ${runtime.draftTreeLocation.longitude}`
      : "none";

    return (
      <section>
        <p data-testid="draft-location">{locationLabel}</p>
        <button
          type="button"
          onClick={() => runtime.setDraftTreeLocation({ latitude: 36.77, longitude: -119.41 })}
        >
          Set draft location
        </button>
      </section>
    );
  }

  function RouteLinks() {
    return (
      <nav>
        <Link to="/">Home</Link>
        <Link to="/map">Map</Link>
        <Link to="/form">Form</Link>
      </nav>
    );
  }

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
    expect(screen.getByRole("button", { name: "Add new tree/story" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ask Cleo" })).toBeInTheDocument();
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

  it("preserves draft tree location across route navigation in the shell", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ThemeProvider>
          <MapProvider>
            <StoryProvider>
              <RouteLinks />
              <RuntimeProbe />
              <App />
            </StoryProvider>
          </MapProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("draft-location")).toHaveTextContent("none");
    await user.click(screen.getByRole("button", { name: "Set draft location" }));
    expect(screen.getByTestId("draft-location")).toHaveTextContent("36.77, -119.41");

    await user.click(screen.getByRole("link", { name: "Map" }));
    expect(screen.getByTestId("draft-location")).toHaveTextContent("36.77, -119.41");

    await user.click(screen.getByRole("link", { name: "Form" }));
    expect(screen.getByTestId("draft-location")).toHaveTextContent("36.77, -119.41");
  });
});
