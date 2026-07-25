import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MapProvider, useMapRuntime } from "./MapContext";

function RuntimeConsumer() {
  const runtime = useMapRuntime();

  return (
    <section>
      <p>Status: {runtime.status}</p>
      <p>Error: {runtime.error?.message ?? "none"}</p>
      <button type="button" onClick={runtime.setLoading}>
        Set loading
      </button>
      <button type="button" onClick={() => runtime.setError({ message: "Map failed" })}>
        Set error
      </button>
      <button type="button" onClick={() => runtime.setReady({ mapView: null, webMap: null })}>
        Set ready
      </button>
      <button type="button" onClick={runtime.reset}>
        Reset
      </button>
    </section>
  );
}

describe("MapProvider", () => {
  it("throws if useMapRuntime is called outside provider", () => {
    expect(() => render(<RuntimeConsumer />)).toThrowError(
      "useMapRuntime must be used within MapProvider.",
    );
  });

  it("transitions runtime status across loading, error, ready, and reset", async () => {
    const user = userEvent.setup();
    render(
      <MapProvider>
        <RuntimeConsumer />
      </MapProvider>,
    );

    expect(screen.getByText("Status: idle")).toBeInTheDocument();
    expect(screen.getByText("Error: none")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Set loading" }));
    expect(screen.getByText("Status: loading")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Set error" }));
    expect(screen.getByText("Status: error")).toBeInTheDocument();
    expect(screen.getByText("Error: Map failed")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Set ready" }));
    expect(screen.getByText("Status: ready")).toBeInTheDocument();
    expect(screen.getByText("Error: none")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByText("Status: idle")).toBeInTheDocument();
    expect(screen.getByText("Error: none")).toBeInTheDocument();
  });
});
