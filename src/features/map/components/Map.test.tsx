import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { MapProvider, useMapRuntime } from "../../../map/context/MapContext";
import { MapPlaceholder } from "./Map";

function RuntimeProbe() {
  const runtime = useMapRuntime();
  const locationLabel = runtime.draftTreeLocation
    ? `${runtime.draftTreeLocation.latitude}, ${runtime.draftTreeLocation.longitude}`
    : "none";

  return (
    <section>
      <p data-testid="draft-location">{locationLabel}</p>
      <button
        type="button"
        onClick={() => runtime.setDraftTreeLocation({ latitude: 37.16611, longitude: -119.44944 })}
      >
        Set draft location
      </button>
    </section>
  );
}

function MapMountHarness() {
  const [mounted, setMounted] = useState(true);

  return (
    <section>
      <button type="button" onClick={() => setMounted((current) => !current)}>
        Toggle map mount
      </button>
      {mounted ? <MapPlaceholder /> : null}
    </section>
  );
}

describe("MapPlaceholder", () => {
  it("does not hard-reset map view with static center/zoom props", () => {
    render(
      <MapProvider>
        <MapPlaceholder />
      </MapProvider>,
    );

    const mapElement = screen.getByLabelText("Map viewport").querySelector("arcgis-map");
    expect(mapElement).toBeTruthy();
    expect(mapElement).toHaveAttribute("item-id", "20712c612e0149c99d32354f089881c4");
    expect(mapElement).not.toHaveAttribute("center");
    expect(mapElement).not.toHaveAttribute("zoom");
  });

  it("uses the provided webmap item id when configured", () => {
    const { container } = render(
      <MapProvider>
        <MapPlaceholder mapItemId="1843fdd0fd914ca0bf772201e0cc0665" />
      </MapProvider>,
    );

    const mapElement = container.querySelector("arcgis-map");
    expect(mapElement).toHaveAttribute("item-id", "1843fdd0fd914ca0bf772201e0cc0665");
  });

  it("preserves draft tree location when map remounts", async () => {
    const user = userEvent.setup();
    render(
      <MapProvider>
        <RuntimeProbe />
        <MapMountHarness />
      </MapProvider>,
    );

    expect(screen.getByTestId("draft-location")).toHaveTextContent("none");

    await user.click(screen.getByRole("button", { name: "Set draft location" }));
    expect(screen.getByTestId("draft-location")).toHaveTextContent("37.16611, -119.44944");

    await user.click(screen.getByRole("button", { name: "Toggle map mount" }));
    await user.click(screen.getByRole("button", { name: "Toggle map mount" }));
    expect(screen.getByTestId("draft-location")).toHaveTextContent("37.16611, -119.44944");
  });
});
