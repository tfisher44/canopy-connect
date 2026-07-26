import { useEffect, useMemo, useRef, useState } from "react";
import { AddTreeForm } from "../../../components/add-tree-form";
import { AddStoryForm } from "../../../components/add-story-form";
import type { AddStoryFormValues, AddTreeFormValues } from "../schema";
import { createStory } from "../services/storyService";
import { createTree } from "../services/treeService";
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

async function showTreeAddedSuccessPopup(
  mapView: NonNullable<ReturnType<typeof useMapRuntime>["mapView"]>,
  latitude: number,
  longitude: number,
): Promise<void> {
  if (!mapView.popup) {
    return;
  }

  const { default: PointClass } = await import("@arcgis/core/geometry/Point");

  mapView.popup.open({
    title: "Tree added",
    content: "Your tree was added successfully.",
    location: new PointClass({
      latitude,
      longitude,
    }),
  });
}

export function TreeStoryFlowPanel() {
  const {
    mapView,
    status,
    selectedTreeId,
    treeSelectionMessage,
    newTreePlacementMessage,
    draftTreeLocation,
    setTreeSelectionEnabled,
    setSelectedTreeId,
    setTreeSelectionMessage,
    setNewTreePlacementEnabled,
    setPointSelectionVisibilityModeEnabled,
    setDraftTreeLocation,
    setNewTreePlacementMessage,
    addCreatedTree,
    clearCreatedTrees,
    searchLocations,
    zoomToLocation,
  } = useMapRuntime();
  const [step, setStep] = useState<TreeStoryFlowStep>("choose-path");
  const [path, setPath] = useState<TreeStoryPath | null>(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [treeSubmitError, setTreeSubmitError] = useState<string | null>(null);
  const [treeSubmitting, setTreeSubmitting] = useState(false);
  const [storySubmitError, setStorySubmitError] = useState<string | null>(null);
  const [storySubmitting, setStorySubmitting] = useState(false);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  const clearTreeStoryRuntimeState = () => {
    setTreeSelectionEnabled(false);
    setTreeSelectionMessage(null);
    setSelectedTreeId(null);
    setDraftTreeLocation(null);
    setNewTreePlacementEnabled(false);
    setNewTreePlacementMessage(null);
    clearCreatedTrees();
  };

  const handleLocationQueryChange = (value: string) => {
    setLocationQuery(value);
    if (value.trim().length === 0) {
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
    }
  };

  const handleAddTreeSubmit = async (values: AddTreeFormValues) => {
    if (!draftTreeLocation) {
      setTreeSubmitError("Select a tree location on the map before adding a tree.");
      return;
    }
    if (!mapView) {
      setTreeSubmitError("Map is not ready yet. Please wait a moment and try again.");
      return;
    }

    setTreeSubmitError(null);
    setTreeSubmitting(true);
    try {
      const createdTree = await createTree({
        mapView,
        latitude: draftTreeLocation.latitude,
        longitude: draftTreeLocation.longitude,
        isAlive: values.isAlive,
        imageFile: values.imageFile,
      });
      addCreatedTree(createdTree);
      setSelectedTreeId(createdTree.id);
      setNewTreePlacementEnabled(false);
      setNewTreePlacementMessage(null);
      void showTreeAddedSuccessPopup(
        mapView,
        createdTree.latitude,
        createdTree.longitude,
      );
      setStep("story-form");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Failed to add tree.";
      setTreeSubmitError(message);
    } finally {
      setTreeSubmitting(false);
    }
  };

  const handleAddStorySubmit = async (values: AddStoryFormValues) => {
    if (!selectedTreeId) {
      setStorySubmitError("Select or create a tree before adding a story.");
      return;
    }
    if (!mapView) {
      setStorySubmitError("Map is not ready yet. Please wait a moment and try again.");
      return;
    }

    setStorySubmitError(null);
    setStorySubmitting(true);
    try {
      await createStory({
        mapView,
        treeId: selectedTreeId,
        title: values.title,
        details: values.details,
        name: values.name || undefined,
        email: values.email || undefined,
        imageFiles: values.imageFiles,
      });
      setStep("success");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Failed to add story.";
      setStorySubmitError(message);
    } finally {
      setStorySubmitting(false);
    }
  };

  const resetFlow = () => {
    setPath(null);
    setStep("choose-path");
    setLocationQuery("");
    setSearchResults([]);
    setSearchError(null);
    setTreeSubmitError(null);
    setStorySubmitError(null);
    clearTreeStoryRuntimeState();
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
        setStorySubmitError(null);
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
        .then((results) => {
          if (cancelled) {
            return;
          }
          setSearchResults(results);
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
  }, [isSearchStep, locationQuery, searchLocations]);

  useEffect(() => {
    setTreeSelectionEnabled(step === "existing-tree-location");
  }, [setTreeSelectionEnabled, step]);

  useEffect(() => {
    setNewTreePlacementEnabled(step === "new-tree-location" || step === "new-tree-form");
  }, [setNewTreePlacementEnabled, step]);

  useEffect(() => {
    setPointSelectionVisibilityModeEnabled(true);
    return () => {
      setPointSelectionVisibilityModeEnabled(false);
      clearTreeStoryRuntimeState();
    };
    // Keep imagery-only mode scoped to panel mount lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const locationStepHint = useMemo(() => {
    if (!mapReady) {
      return "Map is still loading. Search and selection will be available once the map is ready.";
    }
    if (step === "existing-tree-location") {
      return "Now click a story-eligible tree on the map to continue.";
    }
    return "Click the map to set your new tree location, then continue.";
  }, [mapReady, step]);

  const handleResultZoom = (result: LocationSearchResult) => {
    setLocationQuery("");
    setSearchResults([]);
    setIsSearching(false);
    setSearchError(null);
    void zoomToLocation(result).catch((cause: unknown) => {
      const message = cause instanceof Error ? cause.message : "Unable to zoom to that location.";
      setSearchError(message);
    });
  };

  return (
    <section className="stack tree-story-flow" aria-labelledby="tree-story-flow-title">
      <header className="tree-story-flow__header">
        <h2 id="tree-story-flow-title" ref={headingRef} tabIndex={-1}>
          {getHeading(step)}
        </h2>
        {step !== "choose-path" ? (
          <button type="button" className="button button--ghost" onClick={resetFlow}>
            Start over
          </button>
        ) : null}
      </header>

      {step === "choose-path" ? (
        <>
          <p className="muted">
            First, search for a location and choose a result to position the map. Then choose how you want to
            contribute.
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
          {treeSelectionMessage ? (
            <p className="muted" role="status" aria-live="polite">
              {treeSelectionMessage}
            </p>
          ) : null}
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
          {newTreePlacementMessage ? (
            <p className="muted" role="status" aria-live="polite">
              {newTreePlacementMessage}
            </p>
          ) : null}
          {treeSubmitError ? (
            <p className="error" role="alert">
              {treeSubmitError}
            </p>
          ) : null}
          <div className="tree-story-flow__actions">
            <button type="button" className="button button--ghost" onClick={goBack}>
              Back
            </button>
            <button
              type="button"
              className="button"
              onClick={() => setStep("new-tree-form")}
              disabled={!draftTreeLocation}
            >
              Continue to add tree
            </button>
          </div>
        </section>
      ) : null}

      {step === "new-tree-form" ? (
        <section className="stack tree-story-flow__compact-step" aria-label="Add tree flow step">
          <p className="muted">
            Add an optional tree image and choose alive/dead status. You can still click the map to
            move the pin.
          </p>
          {treeSubmitting ? (
            <p className="muted" role="status" aria-live="polite">
              Adding tree and querying map layers. This can take a few seconds.
            </p>
          ) : null}
          {treeSubmitError ? (
            <p className="error" role="alert">
              {treeSubmitError}
            </p>
          ) : null}
          <AddTreeForm
            locationLabel={
              draftTreeLocation
                ? `${draftTreeLocation.latitude}, ${draftTreeLocation.longitude}`
                : "Not selected"
            }
            submitting={treeSubmitting}
            onSubmit={handleAddTreeSubmit}
          />
          <div className="tree-story-flow__actions">
            <button type="button" className="button button--ghost" onClick={goBack}>
              Back
            </button>
          </div>
        </section>
      ) : null}

      {step === "story-form" ? (
        <section className="stack tree-story-flow__compact-step" aria-label="Add story flow step">
          <p className="muted">Add your story details and submit.</p>
          {selectedTreeId ? (
            <AddStoryForm
              submitting={storySubmitting}
              submitError={storySubmitError}
              onSubmit={handleAddStorySubmit}
            />
          ) : (
            <p className="error" role="alert">
              No selected tree found. Go back and select or create a tree first.
            </p>
          )}
          <div className="tree-story-flow__actions">
            <button type="button" className="button button--ghost" onClick={goBack}>
              Back
            </button>
          </div>
        </section>
      ) : null}

      {step === "success" ? (
        <section className="stack" aria-label="Flow setup complete">
          <p className="muted" role="status" aria-live="polite">
            Your tree story was submitted successfully.
          </p>
          <div className="tree-story-flow__actions">
            <button type="button" className="button" onClick={resetFlow}>
              Add another Tree/Story
            </button>
            <button type="button" className="button button--ghost" onClick={goBack}>
              Back
            </button>
          </div>
        </section>
      ) : null}
    </section>
  );
}
