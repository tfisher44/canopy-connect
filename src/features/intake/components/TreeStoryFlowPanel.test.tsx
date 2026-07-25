import { cleanup, render, screen } from "@testing-library/react";
import { afterEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TreeStoryFlowPanel } from "./TreeStoryFlowPanel";

afterEach(() => {
  cleanup();
});

describe("TreeStoryFlowPanel", () => {
  it("lets users choose existing tree path and return to chooser", async () => {
    const user = userEvent.setup();
    render(<TreeStoryFlowPanel />);

    await user.click(screen.getByRole("button", { name: "Select existing tree to add story" }));
    expect(screen.getByRole("heading", { name: "Select existing tree" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Add a new Tree/Story" })).toBeInTheDocument();
  });

  it("lets users move through new tree path and navigate back from story step", async () => {
    const user = userEvent.setup();
    render(<TreeStoryFlowPanel />);

    await user.click(screen.getByRole("button", { name: "Add new tree and story" }));
    expect(screen.getByRole("heading", { name: "Choose location" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Continue to add tree" }));
    expect(screen.getByRole("heading", { name: "Add tree" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Continue to story form" }));
    expect(screen.getByRole("heading", { name: "Add your tree story" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Add tree" })).toBeInTheDocument();
  });
});
