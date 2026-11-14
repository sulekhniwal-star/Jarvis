import React from 'react';
import { projectRepo, DEFAULT_ADMIN_USER_ID } from '@/lib/services';
import { FolderGit2, GitBranch, ExternalLink } from 'lucide-react';

export const revalidate = 0;

export default async function ProjectsPage() {
  const projects = await projectRepo.listByUser(DEFAULT_ADMIN_USER_ID);

  return (
    <div className="space-y-6">
      <div className="border-b border-border/40 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Registered Projects</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connected software repositories and repository configurations under Jarvis management.
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center space-y-3">
          <FolderGit2 className="h-10 w-10 text-muted-foreground mx-auto" />
          <h3 className="text-base font-semibold text-foreground">No projects connected</h3>
          <p className="text-sm text-muted-foreground">
            Connect a GitHub repository to enable autonomous development.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-foreground">{project.name}</h3>
                    <p className="text-xs font-mono text-muted-foreground">{project.slug}</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {project.status}
                  </span>
                </div>

                <div className="bg-muted/40 rounded-lg p-3 space-y-2 text-xs font-mono text-muted-foreground border border-border/50">
                  <div className="flex items-center space-x-2">
                    <FolderGit2 className="h-4 w-4 text-cyan-400" />
                    <span className="text-foreground truncate">{project.github_repo_full_name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <GitBranch className="h-4 w-4 text-primary" />
                    <span>Default branch: <span className="text-foreground">{project.default_branch}</span></span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground font-mono pt-3 border-t border-border/40 flex items-center justify-between">
                <span>Installation ID: {project.github_installation_id}</span>
                <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
