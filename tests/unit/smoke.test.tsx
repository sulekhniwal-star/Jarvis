import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

describe("Smoke Test — Application Entry Point", () => {
  it("renders the Jarvis command centre heading without throwing", () => {
    render(<Home />);
    const heading = screen.getByRole("heading", {
      name: /System Command Center/i,
      level: 2,
    });
    expect(heading).toBeInTheDocument();
  });

  it("displays the operational status badge", () => {
    render(<Home />);
    expect(screen.getAllByText(/JARVIS/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Active/i).length).toBeGreaterThanOrEqual(1);
  });
});
