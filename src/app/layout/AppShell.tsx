import { lazy, Suspense, useState } from "react";
import type { ReactNode } from "react";
import {
  AppRibbon,
  MatteSidebar,
  SidebarToggleButton,
  ThemeControls,
} from "../../components/ui";
import { TreeStoryFlowPanel } from "../../features/intake/components/TreeStoryFlowPanel";
import { MapPlaceholder } from "../../features/map/components/Map";
import { useTheme } from "../../theme/ThemeContext";
import type { ThemeContextValue } from "../../theme/ThemeContext";

type AppShellProps = {
  panelContent?: ReactNode;
  panelLabel?: string;
  defaultPanelOpen?: boolean;
};

function DefaultPanelContent() {
  return <TreeStoryFlowPanel />;
}

const ArcgisAssistantPanel = lazy(async () => {
  const module = await import(
    "../../features/arcgis-assistant/components/ArcgisAssistantPanel"
  );
  return { default: module.ArcgisAssistantPanel };
});

export function AppShell({
  panelContent,
  panelLabel = "Workflow panel",
  defaultPanelOpen = false,
}: AppShellProps) {
  const [panelOpen, setPanelOpen] = useState(defaultPanelOpen);
  const themeContext: ThemeContextValue = useTheme();
  const {
    theme,
    colorMode,
    options,
    colorModeOptions,
    setTheme,
    setColorMode,
  } = themeContext;
  const isDefaultWorkflowPanel = panelContent === undefined;
  const [panelMode, setPanelMode] = useState<"assistant" | "workflow">(
    "workflow",
  );
  const resolvedPanelOpen = isDefaultWorkflowPanel ? true : panelOpen;
  const resolvedPanelContent =
    panelContent ??
    (panelMode === "assistant" ? (
      <Suspense fallback={<p className="muted">Loading ArcGIS Assistant…</p>}>
        <ArcgisAssistantPanel />
      </Suspense>
    ) : (
      <DefaultPanelContent />
    ));
  const shellClassName = `runtime-shell ${resolvedPanelOpen ? "runtime-shell--panel-open" : "runtime-shell--panel-closed"}`;
  const contentClassName =
    `runtime-shell__content ${resolvedPanelOpen ? "runtime-shell__content--panel-open" : ""}`.trim();

  return (
    <div className={shellClassName}>
      <AppRibbon
        title="Canopy Connect"
        subtitle="Plant stories, explore your canopy, and celebrate every tree."
        logoSrc="/brand/canopy-logo.png"
        action={
          isDefaultWorkflowPanel ? (
            <button
              type="button"
              className="button button--ghost runtime-shell__panel-toggle"
              aria-controls="workflow-panel"
              aria-pressed={panelMode === "assistant"}
              onClick={() => {
                setPanelMode((current) =>
                  current === "workflow" ? "assistant" : "workflow",
                );
              }}
            >
              {panelMode === "workflow" ? "Explore map" : "Add a new Tree/Story"}
            </button>
          ) : (
            <SidebarToggleButton
              open={resolvedPanelOpen}
              controls="workflow-panel"
              closedLabel="Open panel"
              openLabel="Explore map"
              onToggle={() => setPanelOpen((current) => !current)}
            />
          )
        }
      />
      <main className={contentClassName}>
        <section
          className="runtime-shell__map-region"
          aria-label="Map workspace"
        >
          <div className="runtime-shell__mascot" aria-hidden="true">
            <img
              className="runtime-shell__mascot-image"
              src="/brand/canopy-mascot.png"
              alt=""
            />
          </div>
          <MapPlaceholder />
        </section>
        {resolvedPanelOpen ? (
          <MatteSidebar
            id="workflow-panel"
            label={
              isDefaultWorkflowPanel && panelMode === "assistant"
                ? "ArcGIS assistant panel"
                : panelLabel
            }
          >
            {panelMode === "workflow" ? (
              <div className="runtime-shell__panel-theme-controls">
                <ThemeControls
                  colorMode={colorMode}
                  activeTheme={theme}
                  themeOptions={options}
                  colorModeOptions={colorModeOptions}
                  onThemeChange={setTheme}
                  onColorModeChange={setColorMode}
                />
              </div>
            ) : null}
            {resolvedPanelContent}
          </MatteSidebar>
        ) : null}
      </main>
    </div>
  );
}
