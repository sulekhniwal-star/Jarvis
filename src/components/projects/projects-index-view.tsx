"use client";

import * as React from "react";
import Link from "next/link";
import {
  FolderKanban,
  Plus,
  Search,
  ArrowUpRight,
  Layers,
  ListTodo,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateProjectModal, ProjectCreatedData } from "./create-project-modal";

export interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  repository_url?: string | null;
  default_branch?: string;
  status: string;
  milestoneCount?: number;
  taskCount?: number;
  completedTaskCount?: number;
  completionVelocity?: number;
  created_at?: string;
}

export interface ProjectsIndexViewProps {
  initialProjects?: ProjectSummary[];
}

export function ProjectsIndexView({
  initialProjects = [],
}: ProjectsIndexViewProps) {
  const [projects, setProjects] = React.useState<ProjectSummary[]>(initialProjects);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const filteredProjects = React.useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(search.toLowerCase())) ||
        p.slug.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || p.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  const handleProjectCreated = (newProject: ProjectCreatedData) => {
    setProjects((prev) => [
      {
        ...newProject,
        milestoneCount: 0,
        taskCount: 0,
        completedTaskCount: 0,
        completionVelocity: 0,
      },
      ...prev,
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
            <FolderKanban className="w-6 h-6 text-accent-cyan" aria-hidden="true" />
            Projects Workspace
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage your autonomous software repositories, milestones, and task DAGs.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-1 border border-surface-3 p-3 rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by name, description, or slug..."
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-surface-2 border border-surface-3 text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-accent-cyan transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {["all", "active", "archived"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                statusFilter === st
                  ? "bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-surface-2 border border-surface-3 text-text-secondary mx-auto flex items-center justify-center">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-semibold text-text-primary">
              {projects.length === 0 ? "No Projects Found" : "No Matching Projects"}
            </h3>
            <p className="text-xs text-text-secondary">
              {projects.length === 0
                ? "Get started by creating your first autonomous software repository project."
                : "Try adjusting your search query or status filter."}
            </p>
          </div>
          {projects.length === 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Project</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const velocity = project.completionVelocity ?? 0;
            const taskCount = project.taskCount ?? 0;
            const milestoneCount = project.milestoneCount ?? 0;

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group block bg-surface-1 border border-surface-3 rounded-xl p-5 hover:border-accent-cyan/40 hover:bg-surface-2/30 transition-all shadow-sm hover:shadow-accent-cyan/5 relative overflow-hidden"
              >
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-text-primary group-hover:text-accent-cyan transition-colors truncate">
                          {project.name}
                        </h2>
                      </div>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {project.slug}
                      </Badge>
                    </div>
                    <div className="p-1 rounded text-text-secondary group-hover:text-accent-cyan transition-colors">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Description */}
                  {project.description && (
                    <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  )}

                  {/* Velocity Meter */}
                  <div className="space-y-1.5 pt-2 border-t border-surface-3/50">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-text-secondary flex items-center gap-1">
                        <Layers className="w-3 h-3 text-accent-cyan" />
                        Velocity
                      </span>
                      <span className="font-bold text-accent-cyan">{velocity}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-3 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-accent-cyan to-accent-ice rounded-full"
                        style={{ width: `${velocity}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer Meta */}
                  <div className="flex items-center justify-between text-xs text-text-secondary pt-2 border-t border-surface-3/50 font-mono text-[11px]">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Flag className="w-3 h-3 text-text-secondary" />
                        {milestoneCount} milestones
                      </span>
                      <span className="flex items-center gap-1">
                        <ListTodo className="w-3 h-3 text-text-secondary" />
                        {taskCount} tasks
                      </span>
                    </div>
                    <Badge variant={project.status === "active" ? "cyan" : "outline"} className="text-[10px]">
                      {project.status}
                    </Badge>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Creation Modal */}
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleProjectCreated}
      />
    </div>
  );
}

function Flag(props: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" x2="4" y1="22" y2="15" />
    </svg>
  );
}
