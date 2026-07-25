import type { ComponentRecord } from "../model/types";

export type LoadCompliantComponentsResult =
  | { state: "ready"; items: ComponentRecord[]; loadedAt: string }
  | { state: "empty"; items: []; loadedAt: string }
  | { state: "error"; message: string; retryable: true };

export interface StyleComplianceCatalogProvider {
  loadCompliantComponents(): Promise<LoadCompliantComponentsResult>;
}

