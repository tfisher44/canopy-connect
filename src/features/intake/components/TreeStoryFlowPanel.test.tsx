import { cleanup, render, screen } from "@testing-library/react";
import { afterEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MapProvider, useMapRuntime } from "../../../map/context/MapContext";
import { TreeStoryFlowPanel } from "./TreeStoryFlowPanel";

afterEach(() => {
  cleanup();
});

describe("TreeStoryFlowPanel", () => {
  function RuntimeProbe() {
    const runtime = useMapRuntime();
    return (
      <p data-testid="point-selection-mode">
        {runtime.pointSelectionVisibilityModeEnabled ? "on" : "off"}
      </p>
    );
  }

  function renderWithProviders() {
    render(
      <MapProvider>
        <RuntimeProbe />
        <TreeStoryFlowPanel />
      </MapProvider>,
    );
  }

  it("lets users choose existing tree path and return to chooser", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    expect(screen.getByRole("searchbox", { name: "Search location" })).toBeInTheDocument();
    expect(screen.getByTestId("point-selection-mode")).toHaveTextContent("off");
    await user.click(screen.getByRole("button", { name: "Select existing tree to add story" }));
    expect(screen.getByRole("heading", { name: "Select existing tree" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Select existing tree" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Continue to story form" })).toBeDisabled();
    expect(screen.getByTestId("point-selection-mode")).toHaveTextContent("on");

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Add a new Tree/Story" })).toBeInTheDocument();
    expect(screen.getByTestId("point-selection-mode")).toHaveTextContent("off");
  });

  it("keeps new tree flow blocked until a map location is chosen", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    expect(screen.getByTestId("point-selection-mode")).toHaveTextContent("off");
    await user.click(screen.getByRole("button", { name: "Add new tree and story" }));
    expect(screen.getByRole("heading", { name: "Choose location" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue to add tree" })).toBeDisabled();
    expect(screen.getByTestId("point-selection-mode")).toHaveTextContent("on");

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Add a new Tree/Story" })).toBeInTheDocument();
    expect(screen.getByTestId("point-selection-mode")).toHaveTextContent("off");
  });

  it("clears point-selection mode on start over and remains stable on re-entry", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await user.click(screen.getByRole("button", { name: "Select existing tree to add story" }));
    expect(screen.getByTestId("point-selection-mode")).toHaveTextContent("on");

    await user.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.getByRole("heading", { name: "Add a new Tree/Story" })).toBeInTheDocument();
    expect(screen.getByTestId("point-selection-mode")).toHaveTextContent("off");

    await user.click(screen.getByRole("button", { name: "Select existing tree to add story" }));
    expect(screen.getByRole("heading", { name: "Select existing tree" })).toBeInTheDocument();
    expect(screen.getByTestId("point-selection-mode")).toHaveTextContent("on");
  });
});
