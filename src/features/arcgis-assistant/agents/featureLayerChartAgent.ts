import { FunctionAgent } from "@arcgis/ai-components/agent-utils/FunctionAgent.js";
import { WorkflowAgent } from "@arcgis/ai-components/agent-utils/WorkflowAgent.js";
import { SequentialWorkflow } from "@arcgis/ai-components/agent-utils/workflows/SequentialWorkflow.js";
import { sendUXSuggestion } from "@arcgis/ai-components/agent-utils/index.js";
import type { AgentRegistration } from "@arcgis/ai-components/utils/index.js";
import z from "zod";
import type { FeatureLayerChartDetail } from "../services/chartCatalog";

type ChartAgentContext = {
  chartCatalog: FeatureLayerChartDetail[];
};

type SelectedChart = {
  layerItemId: string;
  layerId: string | null;
  chartIndex: number;
  title: string;
};

type ChartAgentState = {
  selectedChart?: SelectedChart | null;
};

const selectedChartSchema = z.object({
  layerItemId: z.string().min(1),
  layerId: z.string().nullable(),
  chartIndex: z.number().int().nonnegative(),
  title: z.string().min(1),
});

const selectChartOutputSchema = z.object({
  selectedChart: selectedChartSchema.nullable(),
});

const CHART_RENDER_AGENT_DESCRIPTION = String.raw`- **Feature layer chart renderer** — Use this agent when the user asks to render, show, preview, chart, visualize, or surface configured insights/charts for feature layers in the current web map.

The agent inspects available feature-layer chart metadata and selects the best matching configured chart from the user prompt. It then emits a structured UI suggestion that renders an ArcGIS chart.

Examples:
- "Show me the chart for the trees layer."
- "Render chart 2 for the species layer."
- "Can you visualize a configured map chart?"
- "Show all configured insights."
- "Show all configured feature-layer charts in this webmap."

Do not route to generic data exploration for these chart/insight prompts; use this chart renderer agent to produce slotted chart UI suggestions.`;

function tokenize(input: string): Set<string> {
  return new Set(
    input
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 0),
  );
}

function parseRequestedChartIndex(userRequest: string): number | null {
  const byOrdinal = /chart\s+#?\s*(\d+)/i.exec(userRequest);
  if (!byOrdinal) {
    return null;
  }
  const parsed = Number(byOrdinal[1]);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }
  return Math.floor(parsed) - 1;
}

function scoreLayerMatch(
  userRequest: string,
  userTokens: Set<string>,
  layer: FeatureLayerChartDetail,
): number {
  let score = 0;
  const lowered = userRequest.toLowerCase();
  const title = layer.layerTitle.toLowerCase();

  if (lowered.includes(title)) {
    score += 12;
  }

  const titleTokens = tokenize(layer.layerTitle);
  for (const token of titleTokens) {
    if (userTokens.has(token)) {
      score += 2;
    }
  }

  if (layer.layerId && lowered.includes(layer.layerId.toLowerCase())) {
    score += 8;
  }

  if (layer.layerItemId && lowered.includes(layer.layerItemId.toLowerCase())) {
    score += 10;
  }

  return score;
}

function selectBestChart(
  userRequest: string,
  chartCatalog: FeatureLayerChartDetail[],
): SelectedChart | null {
  const layersWithRenderableCharts = chartCatalog.filter(
    (layer) =>
      typeof layer.layerItemId === "string" &&
      layer.layerItemId.length > 0 &&
      Array.isArray(layer.chartIndexes) &&
      layer.chartIndexes.length > 0,
  );

  if (layersWithRenderableCharts.length === 0) {
    return null;
  }

  const userTokens = tokenize(userRequest);
  const requestedChartIndex = parseRequestedChartIndex(userRequest);

  const ranked = [...layersWithRenderableCharts].sort((left, right) => {
    const leftScore = scoreLayerMatch(userRequest, userTokens, left);
    const rightScore = scoreLayerMatch(userRequest, userTokens, right);
    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }
    return left.layerTitle.localeCompare(right.layerTitle);
  });

  const best = ranked[0];
  if (!best.layerItemId) {
    return null;
  }

  const fallbackChartIndex = best.chartIndexes[0] ?? 0;
  const resolvedChartIndex =
    requestedChartIndex !== null && best.chartIndexes.includes(requestedChartIndex)
      ? requestedChartIndex
      : fallbackChartIndex;

  return {
    layerItemId: best.layerItemId,
    layerId: best.layerId,
    chartIndex: resolvedChartIndex,
    title: `${best.layerTitle} · chart ${resolvedChartIndex + 1}`,
  };
}

function shouldRenderAllCharts(userRequest: string): boolean {
  const normalized = userRequest.toLowerCase();
  return /\ball\b|\bevery\b|\beach\b/.test(normalized);
}

function getAllRenderableCharts(
  chartCatalog: FeatureLayerChartDetail[],
): SelectedChart[] {
  const charts: SelectedChart[] = [];
  for (const layer of chartCatalog) {
    if (!layer.layerItemId || layer.chartIndexes.length === 0) {
      continue;
    }
    for (const chartIndex of layer.chartIndexes) {
      charts.push({
        layerItemId: layer.layerItemId,
        layerId: layer.layerId,
        chartIndex,
        title: `${layer.layerTitle} · chart ${chartIndex + 1}`,
      });
    }
  }
  return charts;
}

const selectFeatureLayerChartAgent = new FunctionAgent<
  ChartAgentState,
  { selectedChart: SelectedChart | null }
>({
  name: "Select Feature Layer Chart",
  description:
    "Selects the most relevant configured feature-layer chart based on the user request.",
  outputSchema: selectChartOutputSchema,
  execute: (state, config) => {
    const context = config?.configurable?.context as ChartAgentContext | undefined;
    const chartCatalog = context?.chartCatalog ?? [];
    const userRequest = state.agentExecutionContext?.userRequest ?? "";
    const selectedChart = selectBestChart(userRequest, chartCatalog);
    return { selectedChart };
  },
});

const emitFeatureLayerChartSuggestionAgent = new FunctionAgent<
  ChartAgentState,
  { selectedChart: SelectedChart | null }
>({
  name: "Emit Feature Layer Chart Suggestion",
  description:
    "Emits a slottable UI suggestion for an ArcGIS chart using the selected layer item id and chart index.",
  execute: async (state, config) => {
    const context = config?.configurable?.context as ChartAgentContext | undefined;
    const chartCatalog = context?.chartCatalog ?? [];
    const userRequest = state.agentExecutionContext?.userRequest ?? "";

    if (shouldRenderAllCharts(userRequest)) {
      const charts = getAllRenderableCharts(chartCatalog);
      if (charts.length === 0) {
        return "I couldn't find any configured feature-layer charts to render right now.";
      }

      for (const chart of charts) {
        await sendUXSuggestion(
          {
            type: "arcgis-chart",
            data: {
              title: chart.title,
              chartIndex: chart.chartIndex,
              "chart-index": chart.chartIndex,
              layerItemId: chart.layerItemId,
              "layer-item-id": chart.layerItemId,
            },
          },
          config,
        );
      }

      return `Attempting to render ${charts.length} configured chart(s).`;
    }

    const selectedChart = state.selectedChart ?? null;
    if (!selectedChart) {
      return "I couldn't find any configured feature-layer charts to render right now.";
    }

    await sendUXSuggestion(
      {
        type: "arcgis-chart",
        data: {
          title: selectedChart.title,
          chartIndex: selectedChart.chartIndex,
          "chart-index": selectedChart.chartIndex,
          layerItemId: selectedChart.layerItemId,
          "layer-item-id": selectedChart.layerItemId,
        },
      },
      config,
    );

    return `Attempting to render "${selectedChart.title}".`;
  },
});

const chartWorkflow = new SequentialWorkflow<ChartAgentState>({
  agents: [selectFeatureLayerChartAgent, emitFeatureLayerChartSuggestionAgent],
});

const featureLayerChartWorkflowAgent = new WorkflowAgent<ChartAgentState>({
  name: "Feature Layer Chart Agent",
  description: CHART_RENDER_AGENT_DESCRIPTION,
  workflow: chartWorkflow,
});

export const FeatureLayerChartAgent: AgentRegistration =
  featureLayerChartWorkflowAgent.registration;
