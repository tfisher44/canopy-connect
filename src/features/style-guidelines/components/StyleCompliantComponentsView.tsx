import { useEffect, useMemo, useState } from "react";
import { GlassPanel } from "../../../components/ui";
import type { ComponentRecord } from "../model/types";
import { createInMemoryStyleComplianceCatalogProvider } from "../services/inMemoryStyleComplianceCatalogProvider";
import type { StyleComplianceCatalogProvider } from "../services/styleComplianceCatalogProvider";
import { StyleCompliantComponentsList } from "./StyleCompliantComponentsList";

type StyleCompliantComponentsViewProps = {
  provider?: StyleComplianceCatalogProvider;
};

type ViewState =
  | { state: "loading" }
  | { state: "empty"; loadedAt: string }
  | { state: "ready"; loadedAt: string; items: ComponentRecord[] }
  | { state: "error"; message: string; retryable: true };

function toCompliantItems(records: ComponentRecord[]): ComponentRecord[] {
  return records;
}

const defaultProvider = createInMemoryStyleComplianceCatalogProvider();

export function StyleCompliantComponentsView({ provider = defaultProvider }: StyleCompliantComponentsViewProps) {
  const [reloadToken, setReloadToken] = useState(0);
  const [viewState, setViewState] = useState<ViewState>({ state: "loading" });

  useEffect(() => {
    let active = true;

    void provider
      .loadCompliantComponents()
      .then((result) => {
        if (!active) {
          return;
        }

        if (result.state === "error") {
          setViewState({ state: "error", message: result.message, retryable: result.retryable });
          return;
        }

        if (result.state === "empty") {
          setViewState({ state: "empty", loadedAt: result.loadedAt });
          return;
        }

        setViewState({
          state: "ready",
          loadedAt: result.loadedAt,
          items: toCompliantItems(result.items),
        });
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setViewState({
          state: "error",
          message: "Unable to load style compliance data. Try again.",
          retryable: true,
        });
      });

    return () => {
      active = false;
    };
  }, [provider, reloadToken]);

  const loadedAtLabel = useMemo(() => {
    if (viewState.state === "ready" || viewState.state === "empty") {
      return new Date(viewState.loadedAt).toLocaleString();
    }

    return null;
  }, [viewState]);

  return (
    <GlassPanel className="stack style-compliant-components" labelledBy="style-compliant-components-title">
      <h2 id="style-compliant-components-title">Style-Compliant Components</h2>
      <p className="muted">
        Use this list to pick approved UI components that satisfy style guideline checks.
      </p>
      {loadedAtLabel ? <p className="muted">Last updated: {loadedAtLabel}</p> : null}
      {viewState.state === "loading" ? <p role="status">Loading compliant components…</p> : null}
      {viewState.state === "empty" ? (
        <p role="status">No components currently satisfy the style guidelines.</p>
      ) : null}
      {viewState.state === "error" ? (
        <div className="stack" role="alert">
          <p className="error">{viewState.message}</p>
          {viewState.retryable ? (
            <button
              type="button"
              className="button"
              onClick={() => {
                setViewState({ state: "loading" });
                setReloadToken((value) => value + 1);
              }}
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}
      {viewState.state === "ready" ? <StyleCompliantComponentsList items={viewState.items} /> : null}
    </GlassPanel>
  );
}
