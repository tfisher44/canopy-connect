import { useState } from "react";
import { MapPlaceholder } from "../../features/map/components/MapPlaceholder";
import { useMapView } from "../../map/hooks/useMapView";

export function AppShell() {
  const [panelOpen, setPanelOpen] = useState(false);
  const mapRuntime = useMapView();

  return (
    <div className={`runtime-shell ${panelOpen ? "runtime-shell--panel-open" : ""}`}>
      <header className="runtime-shell__header">
        <h1>Canopy Connect</h1>
        <p className="muted">Map runtime foundation for editable story intake.</p>
        <p className="muted" aria-live="polite">
          Runtime status: {mapRuntime.status}
          {mapRuntime.error ? ` (${mapRuntime.error.message})` : ""}
        </p>
      </header>
      <main className="runtime-shell__content">
        <section className="runtime-shell__map-region" aria-label="Map workspace">
          <div className="runtime-shell__map-controls" aria-label="Map controls anchor">
            <button type="button" className="button button--ghost" disabled>
              Search anchor
            </button>
          </div>
          <MapPlaceholder />
        </section>
        {panelOpen ? (
          <aside id="workflow-panel" className="runtime-shell__panel" aria-label="Workflow panel">
            <section className="panel stack">
              <h2>Workflow Panel</h2>
              <p className="muted">Add Story workflow will mount here in the next increment.</p>
            </section>
          </aside>
        ) : null}
      </main>
      <button
        type="button"
        className="button runtime-shell__panel-toggle"
        onClick={() => setPanelOpen((current) => !current)}
        aria-expanded={panelOpen}
        aria-controls="workflow-panel"
      >
        {panelOpen ? "Hide panel" : "Open panel"}
      </button>
    </div>
  );
}
