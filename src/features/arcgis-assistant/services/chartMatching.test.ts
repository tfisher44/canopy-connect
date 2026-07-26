import { describe, expect, it } from "vitest";
import type { FeatureLayerChartDetail } from "./chartCatalog";
import {
  getAllRenderableCharts,
  selectBestChartMatch,
} from "./chartMatching";

function createChartDetail(
  overrides: Partial<FeatureLayerChartDetail>,
): FeatureLayerChartDetail {
  return {
    layerId: "layer-1",
    layerTitle: "Default Layer",
    layerItemId: "item-1",
    chartCount: 1,
    chartIndexes: [0],
    layerRef: {},
    chartModels: [{}],
    chartMetadata: [{ chartIndex: 0, title: null, description: null }],
    ...overrides,
  };
}

describe("chartMatching", () => {
  it("matches configured charts by chart title tokens", () => {
    const catalog = [
      createChartDetail({
        layerId: "bike-routes",
        layerTitle: "Transportation Layers",
        layerItemId: "bike-item",
        chartMetadata: [
          {
            chartIndex: 0,
            title: "Bike Route Insights",
            description: "Counts by route type",
          },
        ],
      }),
    ];

    const match = selectBestChartMatch("show bike route insights", catalog);

    expect(match?.layer.layerItemId).toBe("bike-item");
    expect(match?.chartIndex).toBe(0);
    expect(match?.title).toBe("Transportation Layers · Bike Route Insights");
  });

  it("matches singular prompt tokens against plural chart descriptions", () => {
    const catalog = [
      createChartDetail({
        layerId: "truck-routes",
        layerTitle: "Freight Network",
        layerItemId: "truck-item",
        chartMetadata: [
          {
            chartIndex: 0,
            title: "Route summary",
            description: "Insights for truck routes by designation",
          },
        ],
      }),
    ];

    const match = selectBestChartMatch("show truck route insight", catalog);

    expect(match?.layer.layerItemId).toBe("truck-item");
    expect(match?.chartIndex).toBe(0);
  });

  it("returns null when two charts are tied on the same prompt", () => {
    const catalog = [
      createChartDetail({
        layerId: "bike-routes",
        layerTitle: "Transportation",
        layerItemId: "bike-item",
        chartMetadata: [
          {
            chartIndex: 0,
            title: "Route Insights",
            description: "Show route insights",
          },
        ],
      }),
      createChartDetail({
        layerId: "truck-routes",
        layerTitle: "Transportation",
        layerItemId: "truck-item",
        chartMetadata: [
          {
            chartIndex: 0,
            title: "Route Insights",
            description: "Show route insights",
          },
        ],
      }),
    ];

    const match = selectBestChartMatch("show route insights", catalog);

    expect(match).toBeNull();
  });

  it("preserves chart titles when enumerating all renderable charts", () => {
    const catalog = [
      createChartDetail({
        layerTitle: "Transit",
        layerItemId: "transit-item",
        chartIndexes: [0, 1],
        chartCount: 2,
        chartModels: [{}, {}],
        chartMetadata: [
          { chartIndex: 0, title: "Bike Route Insights", description: null },
          { chartIndex: 1, title: null, description: null },
        ],
      }),
    ];

    const charts = getAllRenderableCharts(catalog);

    expect(charts).toEqual([
      {
        layerItemId: "transit-item",
        layerId: "layer-1",
        chartIndex: 0,
        title: "Transit · Bike Route Insights",
      },
      {
        layerItemId: "transit-item",
        layerId: "layer-1",
        chartIndex: 1,
        title: "Transit · chart 2",
      },
    ]);
  });
});
