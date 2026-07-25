import { useState } from "react";
import type { ReactNode } from "react";
import {
  AppRibbon,
  GlassPanel,
  MatteSidebar,
  SidebarToggleButton,
} from "../../components/ui";
import { MapPlaceholder } from "../../features/map/components/Map";
import { useTheme } from "../../theme/ThemeContext";

type AppShellProps = {
  panelContent?: ReactNode;
  panelLabel?: string;
  defaultPanelOpen?: boolean;
};

function DefaultPanelContent() {
  return (
    <GlassPanel className="stack">
      <h2>Workflow Panel</h2>
      <p className="muted">
        Add Story workflow will mount here in the next increment.
      </p>
    </GlassPanel>
  );
}

export function AppShell({
  panelContent,
  panelLabel = "Workflow panel",
  defaultPanelOpen = false,
}: AppShellProps) {
  const [panelOpen, setPanelOpen] = useState(defaultPanelOpen);
  const {
    theme,
    colorMode,
    options,
    colorModeOptions,
    setTheme,
    setColorMode,
  } = useTheme();
  const resolvedPanelContent = panelContent ?? <DefaultPanelContent />;
  const shellClassName = `runtime-shell ${panelOpen ? "runtime-shell--panel-open" : "runtime-shell--panel-closed"}`;
  const contentClassName =
    `runtime-shell__content ${panelOpen ? "runtime-shell__content--panel-open" : ""}`.trim();

  return (
    <div className={shellClassName}>
      <AppRibbon
        title="Canopy Connect"
        colorMode={colorMode}
        activeTheme={theme}
        themeOptions={options}
        colorModeOptions={colorModeOptions}
        onThemeChange={setTheme}
        onColorModeChange={setColorMode}
      />
      <main className={contentClassName}>
        <section
          className="runtime-shell__map-region"
          aria-label="Map workspace"
        >
          <MapPlaceholder />
        </section>
        {panelOpen ? (
          <MatteSidebar id="workflow-panel" label={panelLabel}>
            {resolvedPanelContent}
          </MatteSidebar>
        ) : null}
      </main>
      <SidebarToggleButton
        open={panelOpen}
        controls="workflow-panel"
        onToggle={() => setPanelOpen((current) => !current)}
      />
    </div>
  );
}
