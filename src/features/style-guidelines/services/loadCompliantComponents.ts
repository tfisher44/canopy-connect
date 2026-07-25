import { componentRecordListSchema } from "../model/schemas";
import type { ComponentRecord } from "../model/types";

type QueryOptions = {
  now?: Date;
};

export function loadCompliantComponents(
  rawRecords: readonly ComponentRecord[],
  options: QueryOptions = {},
): ComponentRecord[] {
  const validatedRecords = componentRecordListSchema.parse(rawRecords);
  const now = options.now ?? new Date();

  return validatedRecords
    .filter((record) => record.complianceStatus === "compliant")
    .filter((record) => Date.parse(record.lastReviewDate) <= now.getTime())
    .sort((left, right) => {
      const byName = left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
      if (byName !== 0) {
        return byName;
      }

      return Date.parse(right.lastReviewDate) - Date.parse(left.lastReviewDate);
    });
}

