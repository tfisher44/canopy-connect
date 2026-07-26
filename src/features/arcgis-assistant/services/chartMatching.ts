import type {
  FeatureLayerChartDetail,
  FeatureLayerChartMetadata,
} from "./chartCatalog";

const GENERIC_MATCH_TOKENS = new Set([
  "a",
  "an",
  "and",
  "can",
  "chart",
  "charts",
  "configured",
  "current",
  "feature",
  "for",
  "in",
  "insight",
  "insights",
  "layer",
  "layers",
  "map",
  "me",
  "of",
  "on",
  "please",
  "preview",
  "render",
  "show",
  "surface",
  "the",
  "visualize",
  "webmap",
  "with",
  "you",
]);

const MIN_MATCH_SCORE = 8;

type MatchWeights = {
  exactPhrase: number;
  token: number;
  phrase: number;
};

type MatchSignals = {
  score: number;
  exactPhraseMatches: number;
  sharedTokenCount: number;
  sharedPhraseCount: number;
};

type NormalizedSearch = {
  rawLower: string;
  normalizedText: string;
  tokens: string[];
  tokenSet: Set<string>;
  phraseSet: Set<string>;
};

export type RenderableChartMatch = {
  layer: FeatureLayerChartDetail;
  chartIndex: number;
  chartMetadata?: FeatureLayerChartMetadata;
  title: string;
  score: number;
  exactPhraseMatches: number;
  sharedTokenCount: number;
  sharedPhraseCount: number;
};

function normalizeToken(token: string): string | null {
  const cleaned = token.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (cleaned.length === 0) {
    return null;
  }
  if (cleaned.endsWith("ies") && cleaned.length > 4) {
    return `${cleaned.slice(0, -3)}y`;
  }
  if (/(ches|shes|sses|xes|zes)$/.test(cleaned) && cleaned.length > 4) {
    return cleaned.slice(0, -2);
  }
  if (
    cleaned.endsWith("s") &&
    cleaned.length > 3 &&
    !cleaned.endsWith("ss") &&
    !cleaned.endsWith("sis")
  ) {
    return cleaned.slice(0, -1);
  }
  return cleaned;
}

function tokenizeForMatching(input: string): string[] {
  return input
    .split(/\s+/)
    .map((token) => normalizeToken(token))
    .filter(
      (token): token is string =>
        token !== null && token.length > 0 && !GENERIC_MATCH_TOKENS.has(token),
    );
}

function buildPhraseSet(tokens: string[]): Set<string> {
  const phrases = new Set<string>();
  const maxPhraseLength = Math.min(tokens.length, 3);
  for (let length = 2; length <= maxPhraseLength; length += 1) {
    for (let start = 0; start + length <= tokens.length; start += 1) {
      phrases.add(tokens.slice(start, start + length).join(" "));
    }
  }
  return phrases;
}

function normalizeForSearch(input: string): NormalizedSearch {
  const rawLower = input.toLowerCase();
  const tokens = tokenizeForMatching(
    rawLower.replace(/[^a-z0-9\s]/g, " "),
  );
  return {
    rawLower,
    normalizedText: tokens.join(" "),
    tokens,
    tokenSet: new Set(tokens),
    phraseSet: buildPhraseSet(tokens),
  };
}

function countSetIntersection(
  left: Set<string>,
  right: Set<string>,
): number {
  let matches = 0;
  for (const item of left) {
    if (right.has(item)) {
      matches += 1;
    }
  }
  return matches;
}

function scoreTextCandidate(
  query: NormalizedSearch,
  candidateText: string | null,
  weights: MatchWeights,
): MatchSignals {
  if (!candidateText) {
    return {
      score: 0,
      exactPhraseMatches: 0,
      sharedTokenCount: 0,
      sharedPhraseCount: 0,
    };
  }

  const candidate = normalizeForSearch(candidateText);
  if (candidate.tokens.length === 0) {
    return {
      score: 0,
      exactPhraseMatches: 0,
      sharedTokenCount: 0,
      sharedPhraseCount: 0,
    };
  }

  const exactPhraseMatches =
    query.normalizedText.length > 0 &&
    (query.normalizedText.includes(candidate.normalizedText) ||
      (query.tokens.length >= 2 &&
        candidate.normalizedText.includes(query.normalizedText)))
      ? 1
      : 0;
  const sharedTokenCount = countSetIntersection(query.tokenSet, candidate.tokenSet);
  const sharedPhraseCount = countSetIntersection(query.phraseSet, candidate.phraseSet);

  return {
    score:
      exactPhraseMatches * weights.exactPhrase +
      sharedTokenCount * weights.token +
      sharedPhraseCount * weights.phrase,
    exactPhraseMatches,
    sharedTokenCount,
    sharedPhraseCount,
  };
}

function combineSignals(...signals: MatchSignals[]): MatchSignals {
  return signals.reduce<MatchSignals>(
    (combined, current) => ({
      score: combined.score + current.score,
      exactPhraseMatches:
        combined.exactPhraseMatches + current.exactPhraseMatches,
      sharedTokenCount:
        combined.sharedTokenCount + current.sharedTokenCount,
      sharedPhraseCount:
        combined.sharedPhraseCount + current.sharedPhraseCount,
    }),
    {
      score: 0,
      exactPhraseMatches: 0,
      sharedTokenCount: 0,
      sharedPhraseCount: 0,
    },
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

function buildRenderableChartCandidates(
  chartCatalog: FeatureLayerChartDetail[],
): Array<{
  layer: FeatureLayerChartDetail;
  chartIndex: number;
  chartMetadata?: FeatureLayerChartMetadata;
}> {
  return chartCatalog.flatMap((layer) => {
    if (!layer.layerItemId || layer.chartIndexes.length === 0) {
      return [];
    }

    return layer.chartIndexes.map((chartIndex) => ({
      layer,
      chartIndex,
      chartMetadata: layer.chartMetadata.find(
        (metadata) => metadata.chartIndex === chartIndex,
      ),
    }));
  });
}

export function buildChartDisplayTitle(
  layer: FeatureLayerChartDetail,
  chartIndex: number,
  chartMetadata?: FeatureLayerChartMetadata,
): string {
  if (chartMetadata?.title) {
    return `${layer.layerTitle} · ${chartMetadata.title}`;
  }
  return `${layer.layerTitle} · chart ${chartIndex + 1}`;
}

export function rankChartMatches(
  userRequest: string,
  chartCatalog: FeatureLayerChartDetail[],
): RenderableChartMatch[] {
  const query = normalizeForSearch(userRequest);
  const requestedChartIndex = parseRequestedChartIndex(userRequest);

  return buildRenderableChartCandidates(chartCatalog)
    .map(({ layer, chartIndex, chartMetadata }) => {
      const layerSignals = combineSignals(
        scoreTextCandidate(query, layer.layerTitle, {
          exactPhrase: 14,
          token: 2,
          phrase: 4,
        }),
        scoreTextCandidate(query, layer.layerId, {
          exactPhrase: 8,
          token: 2,
          phrase: 3,
        }),
        scoreTextCandidate(query, layer.layerItemId, {
          exactPhrase: 10,
          token: 2,
          phrase: 3,
        }),
      );
      const chartSignals = combineSignals(
        scoreTextCandidate(query, chartMetadata?.title ?? null, {
          exactPhrase: 20,
          token: 4,
          phrase: 7,
        }),
        scoreTextCandidate(query, chartMetadata?.description ?? null, {
          exactPhrase: 12,
          token: 2,
          phrase: 4,
        }),
      );
      const combinedSignals = combineSignals(layerSignals, chartSignals);

      let score = combinedSignals.score;
      if (requestedChartIndex !== null && requestedChartIndex === chartIndex) {
        score += 8;
      }

      return {
        layer,
        chartIndex,
        chartMetadata,
        title: buildChartDisplayTitle(layer, chartIndex, chartMetadata),
        score,
        exactPhraseMatches: combinedSignals.exactPhraseMatches,
        sharedTokenCount: combinedSignals.sharedTokenCount,
        sharedPhraseCount: combinedSignals.sharedPhraseCount,
      };
    })
    .filter(
      (match) =>
        match.score >= MIN_MATCH_SCORE ||
        match.exactPhraseMatches > 0 ||
        match.sharedPhraseCount > 0 ||
        match.sharedTokenCount >= 2,
    )
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }
      if (left.exactPhraseMatches !== right.exactPhraseMatches) {
        return right.exactPhraseMatches - left.exactPhraseMatches;
      }
      if (left.sharedPhraseCount !== right.sharedPhraseCount) {
        return right.sharedPhraseCount - left.sharedPhraseCount;
      }
      if (left.sharedTokenCount !== right.sharedTokenCount) {
        return right.sharedTokenCount - left.sharedTokenCount;
      }
      return left.title.localeCompare(right.title);
    });
}

export function selectBestChartMatch(
  userRequest: string,
  chartCatalog: FeatureLayerChartDetail[],
): RenderableChartMatch | null {
  const ranked = rankChartMatches(userRequest, chartCatalog);
  const best = ranked[0];
  if (!best) {
    return null;
  }

  const runnerUp = ranked[1];
  if (
    runnerUp &&
    best.score === runnerUp.score &&
    best.exactPhraseMatches === runnerUp.exactPhraseMatches &&
    best.sharedPhraseCount === runnerUp.sharedPhraseCount &&
    best.sharedTokenCount === runnerUp.sharedTokenCount
  ) {
    return null;
  }

  return best;
}

export function getAllRenderableCharts(
  chartCatalog: FeatureLayerChartDetail[],
): Array<{
  layerItemId: string;
  layerId: string | null;
  chartIndex: number;
  title: string;
}> {
  return buildRenderableChartCandidates(chartCatalog).map(
    ({ layer, chartIndex, chartMetadata }) => ({
      layerItemId: layer.layerItemId as string,
      layerId: layer.layerId,
      chartIndex,
      title: buildChartDisplayTitle(layer, chartIndex, chartMetadata),
    }),
  );
}
