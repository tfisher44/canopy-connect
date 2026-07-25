import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../../../app/App";
import { renderWithFeatureProviders } from "./testUtils";

describe("Style-compliant components route", () => {
  it("renders dedicated style-compliant components view", () => {
    renderWithFeatureProviders(<App />, { initialEntries: ["/style-guidelines/components"] });

    expect(screen.getByRole("heading", { name: "Style-Compliant Components" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Map workspace" })).toBeInTheDocument();
  });
});

