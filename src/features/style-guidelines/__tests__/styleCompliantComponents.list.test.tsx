import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { componentRecordFixtures } from "../model/fixtures/componentRecords";
import { createInMemoryStyleComplianceCatalogProvider } from "../services/inMemoryStyleComplianceCatalogProvider";
import { StyleCompliantComponentsView } from "../components/StyleCompliantComponentsView";
import { renderWithFeatureProviders } from "./testUtils";

describe("StyleCompliantComponentsView list content", () => {
  it("shows only compliant components with required metadata", async () => {
    const provider = createInMemoryStyleComplianceCatalogProvider({ records: componentRecordFixtures });
    renderWithFeatureProviders(<StyleCompliantComponentsView provider={provider} />);

    expect(await screen.findByRole("heading", { name: "AppRibbon" })).toBeInTheDocument();
    expect(screen.getByText("GlassPanel")).toBeInTheDocument();
    expect(screen.getAllByText("compliant").length).toBeGreaterThan(0);
    expect(screen.queryByText("LegacySidebar")).not.toBeInTheDocument();
    expect(screen.queryByText("MapSearchControl")).not.toBeInTheDocument();
  });
});

