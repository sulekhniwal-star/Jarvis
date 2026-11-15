import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { FolderKanban } from "lucide-react";

// Faulty component for testing ErrorBoundary
function CrashingComponent({ shouldCrash }: { shouldCrash: boolean }) {
  if (shouldCrash) {
    throw new Error("Simulated rendering failure in test component");
  }
  return <div>Component Rendered Successfully</div>;
}

describe("UI State Handling (EmptyState & ErrorBoundary)", () => {
  describe("EmptyState Component", () => {
    it("renders title, description, and custom icon", () => {
      render(
        <EmptyState
          icon={FolderKanban}
          title="No Items Found"
          description="There are currently no items in this section."
        />
      );

      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByText("No Items Found")).toBeInTheDocument();
      expect(
        screen.getByText("There are currently no items in this section.")
      ).toBeInTheDocument();
    });

    it("triggers onAction callback when action button is clicked", () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          title="Empty Test"
          description="Empty description"
          actionLabel="Create Item"
          onAction={handleAction}
        />
      );

      const actionBtn = screen.getByRole("button", { name: "Create Item" });
      fireEvent.click(actionBtn);

      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it("renders link when actionHref is supplied", () => {
      render(
        <EmptyState
          title="Empty Test"
          description="Empty description"
          actionLabel="Go to Projects"
          actionHref="/projects"
        />
      );

      const link = screen.getByRole("link", { name: "Go to Projects" });
      expect(link).toHaveAttribute("href", "/projects");
    });
  });

  describe("ErrorBoundary Component", () => {
    // Suppress console.error in Vitest for expected component crash
    const originalConsoleError = console.error;
    beforeEach(() => {
      console.error = vi.fn();
    });
    afterEach(() => {
      console.error = originalConsoleError;
    });

    it("renders children normally when no exception is thrown", () => {
      render(
        <ErrorBoundary>
          <div>Safe Content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText("Safe Content")).toBeInTheDocument();
    });

    it("catches render errors and displays accessible fallback UI with retry button", () => {
      render(
        <ErrorBoundary>
          <CrashingComponent shouldCrash={true} />
        </ErrorBoundary>
      );

      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(screen.getByText("System Component Exception")).toBeInTheDocument();
      expect(
        screen.getByText("Simulated rendering failure in test component")
      ).toBeInTheDocument();

      const retryBtn = screen.getByRole("button", { name: "Retry Component" });
      expect(retryBtn).toBeInTheDocument();
    });
  });
});
