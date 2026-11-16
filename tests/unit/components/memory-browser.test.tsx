import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryCategoryBadge } from "@/components/memory/memory-category-badge";
import { MemoryCard, MemoryItem } from "@/components/memory/memory-card";
import { MemoryBrowserView } from "@/components/memory/memory-browser-view";
import { CreateMemoryModal } from "@/components/memory/create-memory-modal";

const mockMemories: MemoryItem[] = [
  {
    id: "mem-01",
    user_id: "user-1",
    project_id: "proj-1",
    category: "project_decision",
    content: "Standardize all API routes on Next.js Route Handlers",
    created_at: "2026-11-17T00:00:00Z",
    projectName: "Platform Core",
  },
  {
    id: "mem-02",
    user_id: "user-1",
    project_id: null,
    category: "user_preference",
    content: "Prefer functional components with React.useMemo for expensive derivations",
    created_at: "2026-11-17T00:05:00Z",
  },
  {
    id: "mem-03",
    user_id: "user-1",
    project_id: "proj-1",
    category: "historical_error",
    content: "Do not execute unindexed queries on large tables without LIMIT guards",
    created_at: "2026-11-17T00:10:00Z",
    projectName: "Platform Core",
    similarity: 0.93,
  },
];

describe("MemoryCategoryBadge Component", () => {
  it("renders distinct badges across all four categories", () => {
    const { rerender } = render(<MemoryCategoryBadge category="user_preference" />);
    expect(screen.getByText("Preference")).toBeDefined();

    rerender(<MemoryCategoryBadge category="project_decision" />);
    expect(screen.getByText("Decision")).toBeDefined();

    rerender(<MemoryCategoryBadge category="architecture_pattern" />);
    expect(screen.getByText("Pattern")).toBeDefined();

    rerender(<MemoryCategoryBadge category="historical_error" />);
    expect(screen.getByText("Error")).toBeDefined();
  });
});

describe("MemoryCard Component", () => {
  it("renders content, category badge, and project name", () => {
    render(<MemoryCard memory={mockMemories[0]} />);

    expect(screen.getByText("Decision")).toBeDefined();
    expect(
      screen.getByText("Standardize all API routes on Next.js Route Handlers")
    ).toBeDefined();
    expect(screen.getByText("Platform Core")).toBeDefined();
  });

  it("renders global tag and similarity score badge when present", () => {
    render(<MemoryCard memory={mockMemories[2]} />);

    expect(screen.getByText("93% match")).toBeDefined();
    expect(
      screen.getByText(
        "Do not execute unindexed queries on large tables without LIMIT guards"
      )
    ).toBeDefined();
  });

  it("triggers confirmation flow before deletion", async () => {
    const mockDelete = vi.fn().mockResolvedValue(undefined);
    render(<MemoryCard memory={mockMemories[0]} onDelete={mockDelete} />);

    // Click trash button to trigger confirmation
    const trashBtn = screen.getByLabelText("Delete memory");
    fireEvent.click(trashBtn);

    expect(screen.getByText("Confirm")).toBeDefined();
    expect(screen.getByText("Cancel")).toBeDefined();

    fireEvent.click(screen.getByText("Confirm"));
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith("mem-01");
    });
  });
});

describe("MemoryBrowserView Component", () => {
  it("renders summary metrics cards accurately", () => {
    render(<MemoryBrowserView initialMemories={mockMemories} />);

    expect(screen.getByText("Total Memories")).toBeDefined();
    expect(screen.getByText("3")).toBeDefined();

    // Preferences, Decisions, Patterns appear in metric card as well as tab filter
    expect(screen.getAllByText("Preferences").length).toBe(2);
    expect(screen.getAllByText("Decisions").length).toBe(2);
    expect(screen.getAllByText("Patterns").length).toBe(2);
    expect(screen.getByText("Past Errors")).toBeDefined();
  });

  it("filters memory cards by category tabs", () => {
    render(<MemoryBrowserView initialMemories={mockMemories} />);

    const prefTab = screen.getByRole("tab", { name: "Preferences" });
    fireEvent.click(prefTab);

    expect(
      screen.getByText(
        "Prefer functional components with React.useMemo for expensive derivations"
      )
    ).toBeDefined();
    expect(
      screen.queryByText(
        "Standardize all API routes on Next.js Route Handlers"
      )
    ).toBeNull();
  });

  it("filters memory cards by text search input", () => {
    render(<MemoryBrowserView initialMemories={mockMemories} />);

    const searchInput = screen.getByPlaceholderText(
      "Search semantically (e.g. 'how should we handle API errors?') or by keyword..."
    );
    fireEvent.change(searchInput, { target: { value: "unindexed" } });

    expect(
      screen.getByText(
        "Do not execute unindexed queries on large tables without LIMIT guards"
      )
    ).toBeDefined();
    expect(
      screen.queryByText(
        "Standardize all API routes on Next.js Route Handlers"
      )
    ).toBeNull();
  });

  it("displays empty state when no memories match", () => {
    render(<MemoryBrowserView initialMemories={mockMemories} />);

    const searchInput = screen.getByPlaceholderText(
      "Search semantically (e.g. 'how should we handle API errors?') or by keyword..."
    );
    fireEvent.change(searchInput, { target: { value: "non-existent-guideline" } });

    expect(screen.getByText("No Memories Found")).toBeDefined();
  });
});

describe("CreateMemoryModal Component", () => {
  it("does not render when isOpen is false", () => {
    render(
      <CreateMemoryModal
        isOpen={false}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />
    );

    expect(screen.queryByText("Add Knowledge Memory")).toBeNull();
  });

  it("renders form inputs when isOpen is true", () => {
    render(
      <CreateMemoryModal
        isOpen={true}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />
    );

    expect(screen.getByText("Add Knowledge Memory")).toBeDefined();
    expect(
      screen.getByPlaceholderText(
        "e.g. Always use Supabase server-side client with createClient in Next.js Server Components. Avoid using browser auth tokens on server routes."
      )
    ).toBeDefined();
  });
});
