import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
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

const DEFAULT_WEBMAP_ID = "20712c612e0149c99d32354f089881c4";
const ASK_CLEO_WEBMAP_ID = "1843fdd0fd914ca0bf772201e0cc0665";
const MIN_PANEL_WIDTH_PERCENT = 25;
const MAX_PANEL_WIDTH_PERCENT = 75;
const WORKFLOW_DEFAULT_PANEL_WIDTH_PERCENT = 25;
const ASSISTANT_DEFAULT_PANEL_WIDTH_PERCENT = 25;

function clampPanelWidthPercent(value: number): number {
  return Math.min(MAX_PANEL_WIDTH_PERCENT, Math.max(MIN_PANEL_WIDTH_PERCENT, value));
}

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
  const [activeView, setActiveView] = useState<"map" | "assistant" | "workflow">(
    "map",
  );
  const [assistantSessionId, setAssistantSessionId] = useState(0);
  const [workflowPanelWidthPercent, setWorkflowPanelWidthPercent] = useState(
    WORKFLOW_DEFAULT_PANEL_WIDTH_PERCENT,
  );
  const [assistantPanelWidthPercent, setAssistantPanelWidthPercent] = useState(
    ASSISTANT_DEFAULT_PANEL_WIDTH_PERCENT,
  );
  const contentRef = useRef<HTMLElement | null>(null);
  const resizingViewRef = useRef<"assistant" | "workflow" | null>(null);
  const resizingPointerIdRef = useRef<number | null>(null);
  const resolvedPanelOpen = isDefaultWorkflowPanel ? activeView !== "map" : panelOpen;
  const usesAskCleoMap = isDefaultWorkflowPanel && activeView === "assistant";
  const isResizableLayout = isDefaultWorkflowPanel && resolvedPanelOpen;
  const activePanelWidthPercent =
    activeView === "assistant"
      ? assistantPanelWidthPercent
      : workflowPanelWidthPercent;
  const resolvedPanelContent =
    panelContent ??
    (activeView === "assistant" ? (
      <Suspense fallback={<p className="muted">Loading ArcGIS Assistant…</p>}>
        <ArcgisAssistantPanel key={`assistant-session-${assistantSessionId}`} />
      </Suspense>
    ) : (
      <DefaultPanelContent />
    ));
  const shellClassName = `runtime-shell ${resolvedPanelOpen ? "runtime-shell--panel-open" : "runtime-shell--panel-closed"}`;
  const contentClassName = `runtime-shell__content ${
    resolvedPanelOpen ? "runtime-shell__content--panel-open" : ""
  } ${
    isDefaultWorkflowPanel && activeView === "assistant"
      ? "runtime-shell__content--assistant-view"
      : ""
  } ${
    isResizableLayout ? "runtime-shell__content--resizable" : ""
  }`.trim();
  const contentStyle: CSSProperties | undefined = isResizableLayout
    ? {
        gridTemplateColumns: `minmax(0, ${100 - activePanelWidthPercent}%) var(--runtime-shell-splitter-width, 0.62rem) minmax(0, ${activePanelWidthPercent}%)`,
      }
    : undefined;

  useEffect(() => {
    if (!isResizableLayout) {
      resizingViewRef.current = null;
    }
  }, [isResizableLayout]);

  const setWidthForView = useCallback(
    (view: "assistant" | "workflow", widthPercent: number) => {
      const clampedWidth = clampPanelWidthPercent(widthPercent);
      if (view === "assistant") {
        setAssistantPanelWidthPercent(clampedWidth);
        return;
      }
      setWorkflowPanelWidthPercent(clampedWidth);
    },
    [],
  );

  const updatePanelWidthFromClientX = useCallback(
    (clientX: number) => {
      const resizeTargetView = resizingViewRef.current;
      const contentNode = contentRef.current;
      if (!resizeTargetView || !contentNode) {
        return;
      }
      const bounds = contentNode.getBoundingClientRect();
      if (bounds.width <= 0) {
        return;
      }
      const panelWidthPercent = ((bounds.right - clientX) / bounds.width) * 100;
      setWidthForView(resizeTargetView, panelWidthPercent);
    },
    [setWidthForView],
  );

  const beginResize = (
    event: ReactPointerEvent<HTMLDivElement>,
    view: "assistant" | "workflow",
  ) => {
    resizingViewRef.current = view;
    resizingPointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    updatePanelWidthFromClientX(event.clientX);
  };
  const endResize = () => {
    resizingViewRef.current = null;
    resizingPointerIdRef.current = null;
  };

  return (
    <div className={shellClassName}>
      <AppRibbon
        title="Canopy Connect"
        subtitle="Plant stories, explore your canopy, and celebrate every tree."
        logoSrc="/brand/canopy-logo.png"
        action={
          isDefaultWorkflowPanel ? (
            <div className="runtime-shell__ribbon-actions">
              <button
                type="button"
                className="button button--ghost runtime-shell__panel-toggle"
                aria-controls="workflow-panel"
                aria-pressed={activeView === "workflow"}
                onClick={() => {
                  setActiveView((current) =>
                    current === "workflow" ? "map" : "workflow",
                  );
                }}
              >
                {activeView === "workflow" ? "Explore" : "Add new tree/story"}
              </button>
              <button
                type="button"
                className="button button--ghost runtime-shell__panel-toggle"
                aria-controls="workflow-panel"
                aria-pressed={activeView === "assistant"}
                onClick={() => {
                  setActiveView((current) => {
                    if (current === "assistant") {
                      return "map";
                    }
                    setAssistantSessionId((sessionId) => sessionId + 1);
                    return "assistant";
                  });
                }}
              >
                Ask Cleo
              </button>
            </div>
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
      <main ref={contentRef} className={contentClassName} style={contentStyle}>
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
          <MapPlaceholder
            mapItemId={usesAskCleoMap ? ASK_CLEO_WEBMAP_ID : DEFAULT_WEBMAP_ID}
          />
        </section>
        {isResizableLayout ? (
          <div
            className="runtime-shell__splitter"
            role="separator"
            aria-label="Resize panel"
            aria-orientation="vertical"
            aria-valuemin={MIN_PANEL_WIDTH_PERCENT}
            aria-valuemax={MAX_PANEL_WIDTH_PERCENT}
            aria-valuenow={Math.round(activePanelWidthPercent)}
            tabIndex={0}
            onPointerDown={(event) => {
              beginResize(event, activeView === "assistant" ? "assistant" : "workflow");
            }}
            onPointerMove={(event) => {
              if (resizingPointerIdRef.current !== event.pointerId) {
                return;
              }
              updatePanelWidthFromClientX(event.clientX);
            }}
            onPointerUp={() => {
              endResize();
            }}
            onPointerCancel={() => {
              endResize();
            }}
            onLostPointerCapture={() => {
              endResize();
            }}
            onKeyDown={(event) => {
              const step = event.shiftKey ? 5 : 2;
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                setWidthForView(
                  activeView === "assistant" ? "assistant" : "workflow",
                  activePanelWidthPercent + step,
                );
                return;
              }
              if (event.key === "ArrowRight") {
                event.preventDefault();
                setWidthForView(
                  activeView === "assistant" ? "assistant" : "workflow",
                  activePanelWidthPercent - step,
                );
              }
            }}
          />
        ) : null}
        {resolvedPanelOpen ? (
          <MatteSidebar
            id="workflow-panel"
            label={
              isDefaultWorkflowPanel && activeView === "assistant"
                ? "ArcGIS assistant panel"
                : panelLabel
            }
          >
            {activeView === "workflow" ? (
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
