import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { useEffect, useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type WebMap from "@arcgis/core/WebMap";
import type MapView from "@arcgis/core/views/MapView";
import { MapProvider, useMapRuntime } from "../../../map/context/MapContext";
import { TreeStoryFlowPanel } from "./TreeStoryFlowPanel";

const { createTreeMock } = vi.hoisted(() => ({
  createTreeMock: vi.fn(),
}));

vi.mock("../services/treeService", () => ({
  createTree: createTreeMock,
}));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  createTreeMock.mockReset();
});

describe("TreeStoryFlowPanel", () => {
  function MapReadyProbe() {
    const runtime = useMapRuntime();
    const initializedRef = useRef(false);

    useEffect(() => {
      if (initializedRef.current) {
        return;
      }
      initializedRef.current = true;
      runtime.setReady({
        webMap: {} as WebMap,
        mapView: {
          popup: {
            open: vi.fn(),
          },
        } as unknown as MapView,
      });
    }, [runtime]);

    return null;
  }

  function RuntimeProbe() {
    const runtime = useMapRuntime();
    const draftLocationLabel = runtime.draftTreeLocation
      ? `${runtime.draftTreeLocation.latitude}, ${runtime.draftTreeLocation.longitude}`
      : "none";
    const selectedTreeLabel = runtime.selectedTreeId ?? "none";
    return (
      <section>
        <p data-testid="point-selection-mode">
          {runtime.pointSelectionVisibilityModeEnabled ? "on" : "off"}
        </p>
        <p data-testid="new-tree-placement-mode">
          {runtime.newTreePlacementEnabled ? "on" : "off"}
        </p>
        <p data-testid="draft-location">{draftLocationLabel}</p>
        <p data-testid="selected-tree">{selectedTreeLabel}</p>
        <button
          type="button"
          onClick={() => runtime.setDraftTreeLocation({ latitude: 35.123456, longitude: -120.654321 })}
        >
          Set draft location
        </button>
      </section>
    );
  }

  function PanelMountHarness() {
    const [mounted, setMounted] = useState(true);
    return (
      <section>
        <button type="button" onClick={() => setMounted((current) => !current)}>
          Toggle panel mount
        </button>
        {mounted ? <TreeStoryFlowPanel /> : null}
      </section>
    );
  }

  function renderWithProviders() {
    render(
      <MapProvider>
        <MapReadyProbe />
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

  it("collects tree details first, then creates a new tree and redirects to the story form", async () => {
    const user = userEvent.setup();
    createTreeMock.mockResolvedValue({
      id: "12345",
      latitude: 35.123456,
      longitude: -120.654321,
      isAlive: true,
    });
    renderWithProviders();

    await user.click(screen.getByRole("button", { name: "Add new tree and story" }));
    await user.click(screen.getByRole("button", { name: "Set draft location" }));

    expect(screen.getByRole("button", { name: "Continue to add tree" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Continue to add tree" }));
    expect(screen.getByRole("heading", { name: "Add tree" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add tree" }));

    expect(createTreeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: 35.123456,
        longitude: -120.654321,
        isAlive: true,
        imageFile: undefined,
      }),
    );
    expect(screen.getByRole("heading", { name: "Add your tree story" })).toBeInTheDocument();
    expect(screen.getByLabelText("Story title")).toBeInTheDocument();
    expect(
      screen.queryByText("No selected tree found. Go back and select or create a tree first."),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("new-tree-placement-mode")).toHaveTextContent("off");
  });

  it("clears selected tree and draft marker state when panel unmounts", async () => {
    const user = userEvent.setup();
    createTreeMock.mockResolvedValue({
      id: "12345",
      latitude: 35.123456,
      longitude: -120.654321,
      isAlive: true,
    });
    render(
      <MapProvider>
        <MapReadyProbe />
        <RuntimeProbe />
        <PanelMountHarness />
      </MapProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Add new tree and story" }));
    await user.click(screen.getByRole("button", { name: "Set draft location" }));
    await user.click(screen.getByRole("button", { name: "Continue to add tree" }));
    await user.click(screen.getByRole("button", { name: "Add tree" }));
    expect(screen.getByTestId("selected-tree")).not.toHaveTextContent("none");

    await user.click(screen.getByRole("button", { name: "Toggle panel mount" }));
    expect(screen.getByTestId("new-tree-placement-mode")).toHaveTextContent("off");
    expect(screen.getByTestId("draft-location")).toHaveTextContent("none");
    expect(screen.getByTestId("selected-tree")).toHaveTextContent("none");
    expect(screen.getByTestId("point-selection-mode")).toHaveTextContent("off");
  });
});
