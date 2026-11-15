import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppShell } from "@/components/layout/app-shell";

describe("Application Shell & Navigation", () => {
  it("renders skip-to-content accessible link pointing to main content", () => {
    render(
      <AppShell title="Dashboard">
        <div>Child Content</div>
      </AppShell>
    );

    const skipLink = screen.getByRole("link", { name: "Skip to main content" });
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute("href", "#main-content");

    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
    expect(screen.getByText("Child Content")).toBeInTheDocument();
  });

  it("renders desktop sidebar with core navigation items", () => {
    render(
      <AppShell title="Dashboard">
        <div>Child Content</div>
      </AppShell>
    );

    const sidebar = screen.getByLabelText("Sidebar Navigation");
    expect(sidebar).toBeInTheDocument();

    expect(screen.getAllByText("Dashboard").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Projects").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Tasks").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Approvals").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Settings").length).toBeGreaterThanOrEqual(1);
  });

  it("displays pending approvals badge counter when approvals require review", () => {
    render(
      <AppShell title="Dashboard" pendingApprovalsCount={3}>
        <div>Child Content</div>
      </AppShell>
    );

    // Should display alert badge in topbar
    const alertLink = screen.getByRole("link", {
      name: "3 pending approvals require review",
    });
    expect(alertLink).toBeInTheDocument();
    expect(alertLink).toHaveAttribute("href", "/approvals");
  });

  it("toggles mobile navigation drawer via hamburger button", () => {
    render(
      <AppShell title="Dashboard">
        <div>Child Content</div>
      </AppShell>
    );

    const hamburger = screen.getByLabelText("Open mobile navigation");
    expect(hamburger).toBeInTheDocument();

    // Open mobile nav
    fireEvent.click(hamburger);

    const mobileDialog = screen.getByRole("dialog", {
      name: "Mobile Navigation Menu",
    });
    expect(mobileDialog).toBeInTheDocument();

    // Close mobile nav via close button
    const closeBtn = screen.getByLabelText("Close navigation");
    fireEvent.click(closeBtn);

    expect(
      screen.queryByRole("dialog", { name: "Mobile Navigation Menu" })
    ).not.toBeInTheDocument();
  });
});
