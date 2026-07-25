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
    const draftLocationLabel = runtime.draftTreeLocation
      ? `${runtime.draftTreeLocation.latitude}, ${runtime.draftTreeLocation.longitude}`
      : "none";
    return (
      <section>
        <p data-testid="point-selection-mode">
          {runtime.pointSelectionVisibilityModeEnabled ? "on" : "off"}
        </p>
        <p data-testid="new-tree-placement-mode">
          {runtime.newTreePlacementEnabled ? "on" : "off"}
        </p>
        <p data-testid="draft-location">{draftLocationLabel}</p>
        <button
          type="button"
          onClick={() => runtime.setDraftTreeLocation({ latitude: 35.123456, longitude: -120.654321 })}
        >
          Set draft location
        </button>
      </section>
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
    expect(screen.getByTestId("point-selection-mode")).toHaveTextContent("on");
    expect(screen.getByTestId("new-tree-placement-mode")).toHaveTextContent("off");
    await user.click(screen.getByRole("button", { name: "Select existing tree to add story" }));
    expect(screen.getByRole("heading", { name: "Select existing tree" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Select existing tree" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Continue to story form" })).toBeDisabled();
    expect(screen.getByTestId("point-selection-mode")).toHaveTextContent("on");
    expect(screen.getByTestId("new-tree-placement-mode")).toHaveTextContent("off");

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Add a new Tree/Story" })).toBeInTheDocument();
    expect(screen.getByTestId("point-selection-mode")).toHaveTextContent("on");
    expect(screen.getByTestId("new-tree-placement-mode")).toHaveTextContent("off");
  });

  it("keeps new tree flow blocked until a map location is chosen", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    expect(screen.getByTestId("point-selection-mode")).toHaveTextContent("on");
    expect(screen.getByTestId("new-tree-placement-mode")).toHaveTextContent("off");
    await user.click(screen.getByRole("button", { name: "Add new tree and story" }));
    expect(screen.getByRole("heading", { name: "Choose location" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue to add tree" })).toBeDisabled();
    expect(screen.getByTestId("point-selection-mode")).toHaveTextContent("on");
    expect(screen.getByTestId("new-tree-placement-mode")).toHaveTextContent("on");

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Add a new Tree/Story" })).toBeInTheDocument();
    expect(screen.getByTestId("point-selection-mode")).toHaveTextContent("on");
    expect(screen.getByTestId("new-tree-placement-mode")).toHaveTextContent("off");
  });

  it("keeps imagery mode on start over and remains stable on re-entry", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await user.click(screen.getByRole("button", { name: "Select existing tree to add story" }));
    expect(screen.getByTestId("point-selection-mode")).toHaveTextContent("on");

    await user.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.getByRole("heading", { name: "Add a new Tree/Story" })).toBeInTheDocument();
    expect(screen.getByTestId("point-selection-mode")).toHaveTextContent("on");

    await user.click(screen.getByRole("button", { name: "Select existing tree to add story" }));
    expect(screen.getByRole("heading", { name: "Select existing tree" })).toBeInTheDocument();
    expect(screen.getByTestId("point-selection-mode")).toHaveTextContent("on");
  });

  it("persists selected location when continuing to add tree form", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await user.click(screen.getByRole("button", { name: "Add new tree and story" }));
    await user.click(screen.getByRole("button", { name: "Set draft location" }));

    expect(screen.getByRole("button", { name: "Continue to add tree" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Continue to add tree" }));

    expect(screen.getByRole("heading", { name: "Add tree" })).toBeInTheDocument();
    expect(screen.getByTestId("new-tree-placement-mode")).toHaveTextContent("on");
    expect(
      screen.getByText(
        "Add an optional tree image and choose alive/dead status. You can still click the map to move the pin.",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText("35.123456, -120.654321").length).toBeGreaterThan(0);
    expect(screen.getByTestId("draft-location")).toHaveTextContent("35.123456, -120.654321");
  });
});
