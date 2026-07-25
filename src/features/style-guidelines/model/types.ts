export type ComplianceStatus = "compliant" | "non_compliant" | "unreviewed";

export type StyleGuidelineCheckResult = {
  checkId: string;
  checkName: string;
  checkDescription: string;
  passedAt: string;
  reviewedBy: string;
};

export type ComponentRecord = {
  id: string;
  name: string;
  intendedUse: string;
  category?: string;
  complianceStatus: ComplianceStatus;
  lastReviewDate: string;
  reviewCadenceDays: number;
  checksPassed: StyleGuidelineCheckResult[];
};

export type ComplianceListViewState = "loading" | "ready" | "empty" | "error";

export type ComplianceListViewModel = {
  state: ComplianceListViewState;
  items: ComponentRecord[];
  errorMessage?: string;
  canRetry: boolean;
  lastLoadedAt?: string;
};

