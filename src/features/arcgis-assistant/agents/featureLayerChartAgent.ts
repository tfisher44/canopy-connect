import { FunctionAgent } from "@arcgis/ai-components/agent-utils/FunctionAgent.js";
import { WorkflowAgent } from "@arcgis/ai-components/agent-utils/WorkflowAgent.js";
import { SequentialWorkflow } from "@arcgis/ai-components/agent-utils/workflows/SequentialWorkflow.js";
import { sendUXSuggestion } from "@arcgis/ai-components/agent-utils/index.js";
import {
  invokeStructuredPrompt,
  sendTraceMessage,
  type AgentRegistration,
  type ChatHistory,
} from "@arcgis/ai-components/utils/index.js";
import z from "zod";
import type { FeatureLayerChartDetail } from "../services/chartCatalog";
import {
  getAllRenderableCharts,
  rankChartMatches,
  selectBestChartMatch,
} from "../services/chartMatching";

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

const llmChartSelectionSchema = z.object({
  selectedCandidateIndex: z.number().int().nonnegative().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  rationale: z.string().min(1),
});

const CHART_RENDER_AGENT_DESCRIPTION = String.raw`- **Feature layer chart renderer** — Prefer this agent whenever the user asks to show, render, preview, chart, visualize, or surface existing configured insights/charts from the current web map.

Always use this agent for prompts in these patterns when they refer to existing map insights:
- "show XX insights"
- "show XX charts"
- "show charts for XX"
- "render the XX chart"
- "visualize XX insights"

Match requests against the current map's configured chart metadata, including:
- layer titles
- chart titles
- chart descriptions/subtitles

Examples:
- "Show me the chart for the trees layer."
- "Render chart 2 for the species layer."
- "Show bike route insights."
- "Show truck route charts."
- "Show all configured insights."

Only let broader ad hoc exploratory analysis go to data exploration when the request is not asking for an existing configured chart/insight.`;

function shouldRenderAllCharts(userRequest: string): boolean {
  const normalized = userRequest.toLowerCase();
  return /\ball\b|\bevery\b|\beach\b/.test(normalized);
}

type LlmChartCandidate = {
  candidateIndex: number;
  layerItemId: string;
  layerId: string | null;
  layerTitle: string;
  chartIndex: number;
  chartNumber: number;
  chartTitle: string | null;
  chartDescription: string | null;
  displayTitle: string;
};

function buildLlmChartCandidates(
  userRequest: string,
  chartCatalog: FeatureLayerChartDetail[],
): LlmChartCandidate[] {
  const rankedMatches = rankChartMatches(userRequest, chartCatalog);
  const sourceMatches = rankedMatches.length > 0
    ? rankedMatches
    : chartCatalog.flatMap((layer) =>
        layer.chartIndexes.map((chartIndex) => ({
          layer,
          chartIndex,
          chartMetadata: layer.chartMetadata.find(
            (metadata) => metadata.chartIndex === chartIndex,
          ),
          title:
            layer.chartMetadata.find(
              (metadata) => metadata.chartIndex === chartIndex,
            )?.title
              ? `${layer.layerTitle} · ${layer.chartMetadata.find(
                  (metadata) => metadata.chartIndex === chartIndex,
                )?.title}`
              : `${layer.layerTitle} · chart ${chartIndex + 1}`,
          score: 0,
          exactPhraseMatches: 0,
          sharedTokenCount: 0,
          sharedPhraseCount: 0,
        })),
      );

  return sourceMatches
    .filter((candidate) => candidate.layer.layerItemId)
    .slice(0, 12)
    .map((candidate, index) => ({
      candidateIndex: index,
      layerItemId: candidate.layer.layerItemId as string,
      layerId: candidate.layer.layerId,
      layerTitle: candidate.layer.layerTitle,
      chartIndex: candidate.chartIndex,
      chartNumber: candidate.chartIndex + 1,
      chartTitle: candidate.chartMetadata?.title ?? null,
      chartDescription: candidate.chartMetadata?.description ?? null,
      displayTitle: candidate.title,
    }));
}

async function selectChartWithArcgisModel(
  userRequest: string,
  chartCatalog: FeatureLayerChartDetail[],
  messages: ChatHistory | undefined,
  config: unknown,
): Promise<SelectedChart | null> {
  const candidates = buildLlmChartCandidates(userRequest, chartCatalog);
  if (candidates.length === 0) {
    return null;
  }

  const llmSelection = await invokeStructuredPrompt({
    promptText: `You select the best matching configured ArcGIS chart from the current web map.

User request:
${userRequest}

Candidate charts:
${JSON.stringify(candidates, null, 2)}

Rules:
- Choose exactly one candidate only if the request is clearly asking for an existing configured chart or insight from this list.
- Match using layer title, chart title, chart description, and chart number.
- If the request is ambiguous between multiple candidates, broader exploratory analysis, or not a clear configured-chart request, return null.
- If the user mentions a specific chart number, respect it only when it matches a listed candidate.
- Prefer exact semantic matches for phrases like "show bike route insights" or "show truck route charts".

Return the selected candidate index or null, plus confidence and rationale.`,
    schema: llmChartSelectionSchema,
    modelTier: "default",
    temperature: 0,
    messages,
    config: config as Parameters<typeof invokeStructuredPrompt>[0]["config"],
  });

  await sendTraceMessage(
    {
      text: `Chart selector confidence=${llmSelection.confidence}; rationale=${llmSelection.rationale}`,
      agentName: "Feature Layer Chart Agent",
    },
    config as Parameters<typeof sendTraceMessage>[1],
  );

  if (
    llmSelection.selectedCandidateIndex === null ||
    llmSelection.confidence === "low"
  ) {
    return null;
  }

  const selectedCandidate = candidates.find(
    (candidate) => candidate.candidateIndex === llmSelection.selectedCandidateIndex,
  );
  if (!selectedCandidate) {
    return null;
  }

  return {
    layerItemId: selectedCandidate.layerItemId,
    layerId: selectedCandidate.layerId,
    chartIndex: selectedCandidate.chartIndex,
    title: selectedCandidate.displayTitle,
  };
}

const selectFeatureLayerChartAgent = new FunctionAgent<
  ChartAgentState,
  { selectedChart: SelectedChart | null }
>({
  name: "Select Feature Layer Chart",
  description:
    "Selects the most relevant configured feature-layer chart based on the user request.",
  outputSchema: selectChartOutputSchema,
  execute: async (state, config) => {
    const context = config?.configurable?.context as ChartAgentContext | undefined;
    const chartCatalog = context?.chartCatalog ?? [];
    const userRequest = state.agentExecutionContext?.userRequest ?? "";
    const messages = state.agentExecutionContext?.messages;

    try {
      const llmSelectedChart = await selectChartWithArcgisModel(
        userRequest,
        chartCatalog,
        messages,
        config,
      );
      if (llmSelectedChart) {
        return { selectedChart: llmSelectedChart };
      }
    } catch (cause: unknown) {
      await sendTraceMessage(
        {
          text:
            cause instanceof Error
              ? `Chart selector model fallback triggered: ${cause.message}`
              : "Chart selector model fallback triggered.",
          agentName: "Feature Layer Chart Agent",
        },
        config,
      );
    }

    const selectedMatch = selectBestChartMatch(userRequest, chartCatalog);
    if (!selectedMatch) {
      return { selectedChart: null };
    }

    return {
      selectedChart: {
        layerItemId: selectedMatch.layer.layerItemId as string,
        layerId: selectedMatch.layer.layerId,
        chartIndex: selectedMatch.chartIndex,
        title: selectedMatch.title,
      },
    };
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
      return "I couldn't find a confident configured chart match for that request.";
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
