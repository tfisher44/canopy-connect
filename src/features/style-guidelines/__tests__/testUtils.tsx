/* eslint-disable react-refresh/only-export-components */
import { render } from "@testing-library/react";
import type { PropsWithChildren, ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { StoryProvider } from "../../intake/model/StoryContext";
import { MapProvider } from "../../../map/context/MapContext";
import { ThemeProvider } from "../../../theme/ThemeContext";

type RenderFeatureOptions = {
  initialEntries?: string[];
};

function FeatureProviders({ children, initialEntries = ["/"] }: PropsWithChildren<RenderFeatureOptions>) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <ThemeProvider>
        <MapProvider>
          <StoryProvider>{children}</StoryProvider>
        </MapProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

export function renderWithFeatureProviders(ui: ReactElement, options?: RenderFeatureOptions) {
  return render(<FeatureProviders initialEntries={options?.initialEntries}>{ui}</FeatureProviders>);
}
