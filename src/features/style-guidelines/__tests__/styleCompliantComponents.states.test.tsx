import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { ComponentRecord } from "../model/types";
import { componentRecordFixtures } from "../model/fixtures/componentRecords";
import { createInMemoryStyleComplianceCatalogProvider } from "../services/inMemoryStyleComplianceCatalogProvider";
import { StyleCompliantComponentsView } from "../components/StyleCompliantComponentsView";
import { renderWithFeatureProviders } from "./testUtils";

describe("StyleCompliantComponentsView states", () => {
  it("renders an explicit empty state when no components are compliant", async () => {
    const nonCompliantOnly: ComponentRecord[] = componentRecordFixtures.map((record) => ({
      ...record,
      complianceStatus: "non_compliant",
      checksPassed: [],
    }));

    const provider = createInMemoryStyleComplianceCatalogProvider({ records: nonCompliantOnly });
    renderWithFeatureProviders(<StyleCompliantComponentsView provider={provider} />);

    expect(
      await screen.findByText("No components currently satisfy the style guidelines."),
    ).toBeInTheDocument();
  });

  it("renders retryable error state and recovers on retry", async () => {
    const user = userEvent.setup();
    const provider = createInMemoryStyleComplianceCatalogProvider({
      records: componentRecordFixtures,
      failOnLoadCount: 1,
    });

    renderWithFeatureProviders(<StyleCompliantComponentsView provider={provider} />);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: "AppRibbon" })).toBeInTheDocument();
  });
});

