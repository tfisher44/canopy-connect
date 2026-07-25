import { useState } from "react";
import { GlassPanel } from "../../../components/ui";

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
  const [step, setStep] = useState<TreeStoryFlowStep>("choose-path");
  const [path, setPath] = useState<TreeStoryPath | null>(null);

  const resetFlow = () => {
    setPath(null);
    setStep("choose-path");
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

  return (
    <GlassPanel className="stack tree-story-flow" labelledBy="tree-story-flow-title">
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
            Choose how you want to contribute: add a story to an existing tree or add a new tree and
            story.
          </p>
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
          <p className="muted">
            Location search and map tree selection will be connected in the next phase.
          </p>
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

      {step === "new-tree-location" ? (
        <section className="stack" aria-label="New tree location flow step">
          <p className="muted">
            Location search and map marker placement will be added in Phase 2.
          </p>
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
    </GlassPanel>
  );
}
