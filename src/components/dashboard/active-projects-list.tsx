import * as React from "react";
import Link from "next/link";
import { FolderKanban, GitBranch, ArrowUpRight, Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { EmptyState } from "../ui/empty-state";

export interface ProjectItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  defaultBranch?: string;
  status: string;
  taskCount?: number;
}

export interface ActiveProjectsListProps {
  projects?: ProjectItem[];
}

export function ActiveProjectsList({
  projects = [],
}: ActiveProjectsListProps) {
  const count = projects.length;

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-accent-cyan" aria-hidden="true" />
            <CardTitle className="text-base font-semibold">Active Projects</CardTitle>
          </div>
          <Link href="/projects/new">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>New</span>
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-center">
        {count === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No Active Projects"
            description="Create your first project repository workspace to begin autonomous software delivery."
            actionLabel="Create Project"
            actionHref="/projects/new"
            className="border-none bg-transparent p-4"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {projects.slice(0, 4).map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.slug}`}
                className="group p-4 rounded-xl bg-surface-2/40 border border-surface-3 hover:border-accent-cyan/40 hover:bg-surface-2/70 transition-all flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm text-text-primary group-hover:text-accent-cyan transition-colors">
                      {project.name}
                    </span>
                    <span className="font-mono text-xs text-text-secondary">
                      /{project.slug}
                    </span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-text-secondary group-hover:text-accent-cyan transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-surface-3/50">
                  <div className="flex items-center gap-1.5 text-text-secondary">
                    <GitBranch className="w-3.5 h-3.5 text-accent-ice" />
                    <span className="font-mono">{project.defaultBranch ?? "main"}</span>
                  </div>
                  <Badge variant="cyan" className="text-[10px]">
                    {project.taskCount ?? 0} Tasks
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
