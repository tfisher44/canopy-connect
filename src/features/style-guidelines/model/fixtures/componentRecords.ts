import type { ComponentRecord } from "../types";

export const componentRecordFixtures: ComponentRecord[] = [
  {
    id: "app-ribbon",
    name: "AppRibbon",
    intendedUse: "Top title ribbon with app name and optional actions.",
    category: "layout",
    complianceStatus: "compliant",
    lastReviewDate: "2026-07-15T00:00:00.000Z",
    reviewCadenceDays: 30,
    checksPassed: [
      {
        checkId: "color-contrast",
        checkName: "Color contrast",
        checkDescription: "Text and surface pairings meet minimum dark-theme contrast.",
        passedAt: "2026-07-15T00:00:00.000Z",
        reviewedBy: "Design System Guild",
      },
      {
        checkId: "token-compliance",
        checkName: "Token compliance",
        checkDescription: "Uses semantic token contract without hardcoded colors.",
        passedAt: "2026-07-15T00:00:00.000Z",
        reviewedBy: "Design System Guild",
      },
    ],
  },
  {
    id: "glass-panel",
    name: "GlassPanel",
    intendedUse: "Reusable translucent panel surface for overlays and cards.",
    category: "surface",
    complianceStatus: "compliant",
    lastReviewDate: "2026-05-01T00:00:00.000Z",
    reviewCadenceDays: 45,
    checksPassed: [
      {
        checkId: "blur-consistency",
        checkName: "Blur consistency",
        checkDescription: "Matches standard glassmorphic matte blur treatment.",
        passedAt: "2026-05-01T00:00:00.000Z",
        reviewedBy: "Design System Guild",
      },
    ],
  },
  {
    id: "legacy-sidebar",
    name: "LegacySidebar",
    intendedUse: "Older sidebar shell awaiting token migration.",
    category: "layout",
    complianceStatus: "non_compliant",
    lastReviewDate: "2026-06-01T00:00:00.000Z",
    reviewCadenceDays: 30,
    checksPassed: [],
  },
  {
    id: "map-search-control",
    name: "MapSearchControl",
    intendedUse: "Top-left map search control wrapper.",
    category: "map",
    complianceStatus: "unreviewed",
    lastReviewDate: "2026-07-01T00:00:00.000Z",
    reviewCadenceDays: 30,
    checksPassed: [],
  },
];

