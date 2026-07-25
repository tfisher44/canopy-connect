import { useEffect, useMemo, useState } from "react";
import type { LocationSearchResult } from "../../../map/context/MapContext";
import { useMapRuntime } from "../../../map/context/MapContext";

type TreeStoryPath = "existing-tree" | "new-tree";

type TreeStoryFlowStep =
  | "choose-path"
  | "existing-tree-location"
  | "new-tree-location"
  | "new-tree-form"
  | "story-form"
  | "success";

function getHeading(step: TreeStoryFlowStep): string {
  switch (step) {
    case "choose-path":
      return "Add a new Tree/Story";
    case "existing-tree-location":
      return "Select existing tree";
    case "new-tree-location":
      return "Choose location";
    case "new-tree-form":
      return "Add tree";
    case "story-form":
      return "Add your tree story";
    case "success":
      return "Flow ready";
  }
}

export function TreeStoryFlowPanel() {
  const {
    status,
    selectedTreeId,
    treeSelectionMessage,
    setTreeSelectionEnabled,
    searchLocations,
    zoomToLocation,
  } = useMapRuntime();
  const [step, setStep] = useState<TreeStoryFlowStep>("choose-path");
  const [path, setPath] = useState<TreeStoryPath | null>(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleLocationQueryChange = (value: string) => {
    setLocationQuery(value);
    if (value.trim().length === 0) {
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
    }
  };

  const resetFlow = () => {
    setPath(null);
    setStep("choose-path");
    setLocationQuery("");
    setSearchResults([]);
    setSearchError(null);
    setTreeSelectionEnabled(false);
  };

  const goBack = () => {
    switch (step) {
      case "choose-path":
        return;
      case "existing-tree-location":
      case "new-tree-location":
        resetFlow();
        return;
      case "new-tree-form":
        setStep("new-tree-location");
        return;
      case "story-form":
        setStep(path === "new-tree" ? "new-tree-form" : "existing-tree-location");
        return;
      case "success":
        setStep("story-form");
        return;
    }
  };

  const isLocationStep = step === "existing-tree-location" || step === "new-tree-location";
  const isSearchStep = step === "choose-path" || isLocationStep;
  const canContinueFromExistingTree = selectedTreeId !== null;
  const mapReady = status === "ready";

  useEffect(() => {
    const trimmedQuery = locationQuery.trim();
    if (!isSearchStep || !trimmedQuery) {
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setIsSearching(true);
      setSearchError(null);
      void searchLocations(trimmedQuery)
        .then(async (results) => {
          if (cancelled) {
            return;
          }
          setSearchResults(results);
          if (results.length > 0) {
            await zoomToLocation(results[0]);
          }
        })
        .catch((cause: unknown) => {
          if (cancelled) {
            return;
          }
          const message =
            cause instanceof Error ? cause.message : "Location search failed. Please try again.";
          setSearchError(message);
          setSearchResults([]);
        })
        .finally(() => {
          if (!cancelled) {
            setIsSearching(false);
          }
        });
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isSearchStep, locationQuery, searchLocations, zoomToLocation]);

  useEffect(() => {
    setTreeSelectionEnabled(step === "existing-tree-location");
  }, [setTreeSelectionEnabled, step]);

  const locationStepHint = useMemo(() => {
    if (!mapReady) {
      return "Map is still loading. Search and selection will be available once the map is ready.";
    }
    if (step === "existing-tree-location") {
      return "Now click a story-eligible tree on the map to continue.";
    }
    return "Location is set. Continue when ready to add the tree details.";
  }, [mapReady, step]);

  const handleResultZoom = (result: LocationSearchResult) => {
    setSearchError(null);
    void zoomToLocation(result).catch((cause: unknown) => {
      const message = cause instanceof Error ? cause.message : "Unable to zoom to that location.";
      setSearchError(message);
    });
  };

  return (
    <section className="stack tree-story-flow" aria-labelledby="tree-story-flow-title">
      <header className="tree-story-flow__header">
        <h2 id="tree-story-flow-title">{getHeading(step)}</h2>
        {step !== "choose-path" ? (
          <button type="button" className="button button--ghost" onClick={resetFlow}>
            Start over
          </button>
        ) : null}
      </header>

      {step === "choose-path" ? (
        <>
          <p className="muted">
            First, search for a location to position the map. Then choose how you want to contribute.
          </p>
          <label className="field">
            <span>Search location</span>
            <input
              className="tree-story-flow__search-input"
              type="search"
              value={locationQuery}
              onChange={(event) => handleLocationQueryChange(event.target.value)}
              placeholder="Start typing an address or place"
              disabled={!mapReady}
            />
          </label>
          {isSearching ? <p className="muted">Searching locations…</p> : null}
          {searchError ? (
            <p className="error" role="alert">
              {searchError}
            </p>
          ) : null}
          {searchResults.length > 0 ? (
            <ul className="tree-story-flow__search-results" aria-label="Location search results">
              {searchResults.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => handleResultZoom(result)}
                  >
                    {result.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="tree-story-flow__option-grid">
            <button
              type="button"
              className="button"
              onClick={() => {
                setPath("existing-tree");
                setStep("existing-tree-location");
              }}
            >
              Select existing tree to add story
            </button>
            <button
              type="button"
              className="button"
              onClick={() => {
                setPath("new-tree");
                setStep("new-tree-location");
              }}
            >
              Add new tree and story
            </button>
          </div>
        </>
      ) : null}

      {step === "existing-tree-location" ? (
        <section className="stack" aria-label="Existing tree flow step">
          <p className="muted">{locationStepHint}</p>
          {treeSelectionMessage ? <p className="muted">{treeSelectionMessage}</p> : null}
          <div className="tree-story-flow__actions">
            <button type="button" className="button button--ghost" onClick={goBack}>
              Back
            </button>
            <button
              type="button"
              className="button"
              onClick={() => setStep("story-form")}
              disabled={!canContinueFromExistingTree}
            >
              Continue to story form
            </button>
          </div>
        </section>
      ) : null}

      {step === "new-tree-location" ? (
        <section className="stack" aria-label="New tree location flow step">
          <p className="muted">{locationStepHint}</p>
          <div className="tree-story-flow__actions">
            <button type="button" className="button button--ghost" onClick={goBack}>
              Back
            </button>
            <button type="button" className="button" onClick={() => setStep("new-tree-form")}>
              Continue to add tree
            </button>
          </div>
        </section>
      ) : null}

      {step === "new-tree-form" ? (
        <section className="stack" aria-label="Add tree flow step">
          <p className="muted">Tree image and dead/alive controls will be implemented in Phase 3.</p>
          <div className="tree-story-flow__actions">
            <button type="button" className="button button--ghost" onClick={goBack}>
              Back
            </button>
            <button type="button" className="button" onClick={() => setStep("story-form")}>
              Continue to story form
            </button>
          </div>
        </section>
      ) : null}

      {step === "story-form" ? (
        <section className="stack" aria-label="Add story flow step">
          <p className="muted">
            Story title, images, details, and optional name/email fields will be implemented in
            Phase 4.
          </p>
          <div className="tree-story-flow__actions">
            <button type="button" className="button button--ghost" onClick={goBack}>
              Back
            </button>
            <button type="button" className="button" onClick={() => setStep("success")}>
              Finish flow setup
            </button>
          </div>
        </section>
      ) : null}

      {step === "success" ? (
        <section className="stack" aria-label="Flow setup complete">
          <p className="muted">
            The phased panel flow is wired and ready for map search and form implementation.
          </p>
          <div className="tree-story-flow__actions">
            <button type="button" className="button button--ghost" onClick={goBack}>
              Back
            </button>
          </div>
        </section>
      ) : null}
    </section>
  );
}
