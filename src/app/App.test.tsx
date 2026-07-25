import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { StoryProvider } from "../features/intake/model/StoryContext";
import { App } from "./App";

describe("App", () => {
  it("renders the Home route", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <StoryProvider>
          <App />
        </StoryProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Canopy Connect" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
  });
});
