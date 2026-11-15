import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

describe("Smoke Test — Application Entry Point", () => {
  it("renders the Jarvis command centre heading without throwing", () => {
    render(<Home />);
    const heading = screen.getByRole("heading", { name: /JARVIS/i, level: 1 });
    expect(heading).toBeInTheDocument();
  });

  it("displays the operational status badge", () => {
    render(<Home />);
    const badge = screen.getByText(/System Online • Milestone 0 \/ Phase 1/i);
    expect(badge).toBeInTheDocument();
  });
});
