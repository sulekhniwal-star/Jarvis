import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

describe("UI Primitives", () => {
  describe("Button Component", () => {
    it("renders with default primary variant and handles click events", () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);

      const button = screen.getByRole("button", { name: "Click Me" });
      expect(button).toBeInTheDocument();
      expect(button.className).toContain("bg-accent-cyan");

      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("renders loading spinner and disables button when isLoading is true", () => {
      render(<Button isLoading>Submit</Button>);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      expect(button.querySelector("svg.animate-spin")).toBeInTheDocument();
    });

    it("applies variant classes correctly", () => {
      const { rerender } = render(<Button variant="danger">Delete</Button>);
      let button = screen.getByRole("button", { name: "Delete" });
      expect(button.className).toContain("bg-danger");

      rerender(<Button variant="outline">Cancel</Button>);
      button = screen.getByRole("button", { name: "Cancel" });
      expect(button.className).toContain("border-surface-3");
    });
  });

  describe("Card Component", () => {
    it("renders full compound card hierarchy", () => {
      render(
        <Card data-testid="test-card">
          <CardHeader>
            <CardTitle>Test Project</CardTitle>
            <CardDescription>A test project description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Inner card content</p>
          </CardContent>
          <CardFooter>
            <p>Footer note</p>
          </CardFooter>
        </Card>
      );

      expect(screen.getByTestId("test-card")).toHaveClass("bg-surface-1");
      expect(screen.getByText("Test Project")).toBeInTheDocument();
      expect(screen.getByText("A test project description")).toBeInTheDocument();
      expect(screen.getByText("Inner card content")).toBeInTheDocument();
      expect(screen.getByText("Footer note")).toBeInTheDocument();
    });
  });

  describe("Badge Component", () => {
    it("renders with variant classes and optional pulse indicator", () => {
      const { rerender } = render(<Badge variant="cyan" pulse>Active</Badge>);
      let badge = screen.getByText("Active");
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain("text-accent-cyan");
      expect(badge.querySelector("span.motion-safe\\:animate-pulse")).toBeInTheDocument();

      rerender(<Badge variant="warning">Warning</Badge>);
      badge = screen.getByText("Warning");
      expect(badge.className).toContain("text-warning");
    });
  });

  describe("Skeleton Component", () => {
    it("renders with pulse animation class and aria-hidden", () => {
      const { container } = render(<Skeleton className="w-24 h-6" />);
      const skeleton = container.firstChild as HTMLElement;

      expect(skeleton).toHaveClass("animate-pulse");
      expect(skeleton).toHaveClass("bg-surface-2");
      expect(skeleton).toHaveAttribute("aria-hidden", "true");
    });
  });
});
