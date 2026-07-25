import { cleanup, render, screen } from "@testing-library/react";
import { afterEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MapProvider } from "../../../map/context/MapContext";
import { TreeStoryFlowPanel } from "./TreeStoryFlowPanel";

afterEach(() => {
  cleanup();
});

describe("TreeStoryFlowPanel", () => {
  function renderWithProviders() {
    render(
      <MapProvider>
        <TreeStoryFlowPanel />
      </MapProvider>,
    );
  }

  it("lets users choose existing tree path and return to chooser", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await user.click(screen.getByRole("button", { name: "Select existing tree to add story" }));
    expect(screen.getByRole("heading", { name: "Select existing tree" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue to story form" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Add a new Tree/Story" })).toBeInTheDocument();
  });

  it("keeps new tree flow blocked until a map location is chosen", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await user.click(screen.getByRole("button", { name: "Add new tree and story" }));
    expect(screen.getByRole("heading", { name: "Choose location" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue to add tree" })).toBeDisabled();
  });
});
