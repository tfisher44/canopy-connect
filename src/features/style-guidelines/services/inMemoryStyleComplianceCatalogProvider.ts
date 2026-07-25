import { componentRecordFixtures } from "../model/fixtures/componentRecords";
import type { ComponentRecord } from "../model/types";
import { loadCompliantComponents } from "./loadCompliantComponents";
import type { LoadCompliantComponentsResult, StyleComplianceCatalogProvider } from "./styleComplianceCatalogProvider";

type ProviderOptions = {
  records?: ComponentRecord[];
  failOnLoadCount?: number;
};

export function createInMemoryStyleComplianceCatalogProvider(
  options: ProviderOptions = {},
): StyleComplianceCatalogProvider {
  const records = options.records ?? componentRecordFixtures;
  let loadCount = 0;

  return {
    loadCompliantComponents(): Promise<LoadCompliantComponentsResult> {
      loadCount += 1;

      if (options.failOnLoadCount === loadCount) {
        return Promise.resolve({
          state: "error",
          message: "Unable to load style compliance data. Try again.",
          retryable: true,
        });
      }

      const items = loadCompliantComponents(records);
      const loadedAt = new Date().toISOString();

      if (items.length === 0) {
        return Promise.resolve({ state: "empty", items: [], loadedAt });
      }

      return Promise.resolve({
        state: "ready",
        items,
        loadedAt,
      });
    },
  };
}
