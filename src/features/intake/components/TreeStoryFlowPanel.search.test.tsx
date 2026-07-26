import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TreeStoryFlowPanel } from "./TreeStoryFlowPanel";

const { searchLocationsMock, zoomToLocationMock, runtimeMock } = vi.hoisted(
  () => {
    const searchLocations = vi.fn();
    const zoomToLocation = vi.fn();
    return {
      searchLocationsMock: searchLocations,
      zoomToLocationMock: zoomToLocation,
      runtimeMock: {
        status: "ready" as const,
        selectedTreeId: null,
        treeSelectionMessage: null,
        newTreePlacementMessage: null,
        draftTreeLocation: null,
        setTreeSelectionEnabled: vi.fn(),
        setSelectedTreeId: vi.fn(),
        setTreeSelectionMessage: vi.fn(),
        setNewTreePlacementEnabled: vi.fn(),
        setPointSelectionVisibilityModeEnabled: vi.fn(),
        setDraftTreeLocation: vi.fn(),
        setNewTreePlacementMessage: vi.fn(),
        addCreatedTree: vi.fn(),
        clearCreatedTrees: vi.fn(),
        searchLocations,
        zoomToLocation,
      },
    };
  },
);

vi.mock("../../../map/context/MapContext", () => ({
  useMapRuntime: () => runtimeMock,
}));

describe("TreeStoryFlowPanel search behavior", () => {
  beforeEach(() => {
    searchLocationsMock.mockReset();
    zoomToLocationMock.mockReset();
    zoomToLocationMock.mockResolvedValue(undefined);
    Object.assign(runtimeMock, {
      status: "ready",
      selectedTreeId: null,
      treeSelectionMessage: null,
      newTreePlacementMessage: null,
      draftTreeLocation: null,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("does not auto-zoom to the first search result", async () => {
    const result = {
      id: "esri-hq",
      label: "Esri HQ",
      latitude: 34.056,
      longitude: -117.195,
    };
    searchLocationsMock.mockResolvedValue([result]);

    const user = userEvent.setup();
    render(<TreeStoryFlowPanel />);

    await user.type(
      screen.getByRole("searchbox", { name: "Search location" }),
      "ESRi",
    );
    await waitFor(() => {
      expect(searchLocationsMock).toHaveBeenCalledWith("ESRi");
    }, { timeout: 2000 });
    expect(zoomToLocationMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Esri HQ" }));
    await waitFor(() => {
      expect(zoomToLocationMock).toHaveBeenCalledWith(result);
    });
    expect(screen.getByRole("searchbox", { name: "Search location" })).toHaveValue("");
    expect(
      screen.queryByRole("button", { name: "Esri HQ" }),
    ).not.toBeInTheDocument();
  });
});
