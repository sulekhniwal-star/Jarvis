"use client";

import * as React from "react";
import {
  Brain,
  Search,
  Plus,
  RefreshCw,
  Sparkles,
  User,
  CheckCircle2,
  Layers,
  AlertTriangle,
  Folder,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MemoryCard, MemoryItem } from "./memory-card";
import { CreateMemoryModal, ProjectOption } from "./create-memory-modal";
import { MemoryCategory } from "@/types/database";

export interface MemoryMetrics {
  total: number;
  userPreferences: number;
  projectDecisions: number;
  architecturePatterns: number;
  historicalErrors: number;
}

export interface MemoryBrowserViewProps {
  initialMemories?: MemoryItem[];
  initialMetrics?: MemoryMetrics;
  projects?: ProjectOption[];
  refreshUrl?: string;
}

export function MemoryBrowserView({
  initialMemories = [],
  initialMetrics,
  projects = [],
  refreshUrl = "/api/memories",
}: MemoryBrowserViewProps) {
  const [memories, setMemories] = React.useState<MemoryItem[]>(initialMemories);
  const [search, setSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [selectedProject, setSelectedProject] = React.useState<string>("all");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchMemories = React.useCallback(
    async (queryOverride?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const queryTerm = queryOverride !== undefined ? queryOverride : search;
        const params = new URLSearchParams();

        if (queryTerm.trim()) {
          // If query has 3+ words, search semantically via ?q=
          if (queryTerm.trim().split(/\s+/).length >= 2) {
            params.set("q", queryTerm.trim());
          } else {
            params.set("search", queryTerm.trim());
          }
        }

        if (selectedCategory !== "all") {
          params.set("category", selectedCategory);
        }

        if (selectedProject !== "all") {
          params.set("projectId", selectedProject);
        }

        const url = `${refreshUrl}?${params.toString()}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch memories (HTTP ${res.status})`);
        }

        const data = await res.json();
        setMemories(data.memories || []);
      } catch (err: unknown) {
        const e = err as Error;
        setError(e.message || "Failed to load memories");
      } finally {
        setIsLoading(false);
      }
    },
    [search, selectedCategory, selectedProject, refreshUrl]
  );

  // Compute live metrics
  const metrics: MemoryMetrics = React.useMemo(() => {
    if (initialMetrics && memories === initialMemories) {
      return initialMetrics;
    }
    const total = memories.length;
    const userPreferences = memories.filter((m) => m.category === "user_preference").length;
    const projectDecisions = memories.filter((m) => m.category === "project_decision").length;
    const architecturePatterns = memories.filter((m) => m.category === "architecture_pattern").length;
    const historicalErrors = memories.filter((m) => m.category === "historical_error").length;

    return {
      total,
      userPreferences,
      projectDecisions,
      architecturePatterns,
      historicalErrors,
    };
  }, [memories, initialMetrics, initialMemories]);

  // Client-side filtering if not performing a server semantic search
  const filteredMemories = React.useMemo(() => {
    return memories.filter((m) => {
      // Category filter
      if (selectedCategory !== "all" && m.category !== selectedCategory) {
        return false;
      }

      // Project filter
      if (selectedProject !== "all") {
        if (selectedProject === "global" && m.project_id !== null) {
          return false;
        }
        if (selectedProject !== "global" && m.project_id !== selectedProject) {
          return false;
        }
      }

      // If text search is active, filter content, category or project name
      if (search.trim()) {
        const term = search.toLowerCase();
        const matchesContent = m.content.toLowerCase().includes(term);
        const matchesCat = m.category.toLowerCase().includes(term);
        const matchesProj = m.projectName ? m.projectName.toLowerCase().includes(term) : false;
        return matchesContent || matchesCat || matchesProj;
      }

      return true;
    });
  }, [memories, selectedCategory, selectedProject, search]);

  const handleCreated = (newMemory: MemoryItem) => {
    setMemories((prev) => [newMemory, ...prev]);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/memories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete memory");
      }
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "Failed to delete memory");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
            <Brain className="w-6 h-6 text-accent-cyan" aria-hidden="true" />
            Semantic Memory Store
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Curate and inspect long-term architectural decisions, user preferences, and historical guidelines injected into autonomous agents.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchMemories()}
            disabled={isLoading}
            aria-label="Refresh memories"
            className="border-surface-3 bg-surface-2 hover:bg-surface-3 text-text-primary"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="bg-accent-cyan text-surface-base font-semibold"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Memory
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Memories */}
        <Card className="border-surface-3 bg-surface-1">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-text-secondary uppercase">
                Total Memories
              </p>
              <h3 className="text-xl font-bold text-text-primary mt-0.5">
                {metrics.total}
              </h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-surface-2 border border-surface-3 flex items-center justify-center text-text-secondary">
              <Brain className="w-4 h-4 text-accent-cyan" />
            </div>
          </CardContent>
        </Card>

        {/* User Preferences */}
        <Card className="border-surface-3 bg-surface-1">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-text-secondary uppercase">
                Preferences
              </p>
              <h3 className="text-xl font-bold text-cyan-400 mt-0.5">
                {metrics.userPreferences}
              </h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <User className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        {/* Project Decisions */}
        <Card className="border-surface-3 bg-surface-1">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-text-secondary uppercase">
                Decisions
              </p>
              <h3 className="text-xl font-bold text-emerald-400 mt-0.5">
                {metrics.projectDecisions}
              </h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        {/* Architecture Patterns */}
        <Card className="border-surface-3 bg-surface-1">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-text-secondary uppercase">
                Patterns
              </p>
              <h3 className="text-xl font-bold text-purple-400 mt-0.5">
                {metrics.architecturePatterns}
              </h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Layers className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        {/* Historical Errors */}
        <Card className="border-surface-3 bg-surface-1">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-text-secondary uppercase">
                Past Errors
              </p>
              <h3 className="text-xl font-bold text-rose-400 mt-0.5">
                {metrics.historicalErrors}
              </h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-surface-1 p-3 rounded-lg border border-surface-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Search semantically (e.g. 'how should we handle API errors?') or by keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void fetchMemories();
              }
            }}
            className="w-full pl-9 pr-20 py-1.5 text-xs bg-surface-2 border border-surface-3 rounded-md text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-1 focus:ring-accent-cyan"
            aria-label="Search memories"
          />
          {search && (
            <button
              onClick={() => void fetchMemories()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-[10px] font-medium bg-accent-cyan/20 text-accent-cyan hover:bg-accent-cyan/30"
            >
              Search
            </button>
          )}
        </div>

        {/* Scope / Project Dropdown */}
        {projects.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-surface-2 border border-surface-3 rounded-md text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-cyan"
              aria-label="Filter by project scope"
            >
              <option value="all">All Scopes</option>
              <option value="global">Global Only</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Category Tabs */}
        <div
          className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0"
          role="tablist"
        >
          {[
            { id: "all", label: "All" },
            { id: "user_preference", label: "Preferences" },
            { id: "project_decision", label: "Decisions" },
            { id: "architecture_pattern", label: "Patterns" },
            { id: "historical_error", label: "Errors" },
          ].map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={selectedCategory === tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                selectedCategory === tab.id
                  ? "bg-accent-cyan text-surface-base font-semibold"
                  : "bg-surface-2 text-text-secondary hover:text-text-primary hover:bg-surface-3 border border-surface-3"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Memory Cards Grid */}
      {filteredMemories.length === 0 ? (
        <Card className="border-surface-3 bg-surface-1 text-center py-12">
          <CardContent className="flex flex-col items-center">
            <Brain className="w-12 h-12 text-text-secondary mb-3 opacity-50" />
            <h3 className="text-base font-semibold text-text-primary">
              No Memories Found
            </h3>
            <p className="text-xs text-text-secondary max-w-sm mt-1">
              {search || selectedCategory !== "all" || selectedProject !== "all"
                ? "No memories match your active search or category filters."
                : "No knowledge memories recorded yet. Add guidelines or decisions to help autonomous agents avoid past mistakes."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="mt-4 border-surface-3 bg-surface-2 hover:bg-surface-3 text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add First Memory
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMemories.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create Memory Modal */}
      <CreateMemoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleCreated}
        projects={projects}
      />
    </div>
  );
}
