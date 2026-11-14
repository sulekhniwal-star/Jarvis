"use client";

import React, { useState } from "react";
import {
  GitBranch,
  ExternalLink,
  Sparkles,
  RefreshCw,
  X,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { FleetRepo } from "../../utils/api";

interface FleetAuditorProps {
  fleetRepos: FleetRepo[];
  isAuditingRepo: string | null;
  isSelfImproving: boolean;
  isBatchUpgrading?: boolean;
  onAuditRepo: (repoName: string) => void;
  onImproveProject: (repoName: string) => void;
  onSelfImproveJarvis: () => void;
  onBatchUpgrade?: () => void;
}

export function FleetAuditor({
  fleetRepos,
  isAuditingRepo,
  isSelfImproving,
  isBatchUpgrading = false,
  onAuditRepo,
  onImproveProject,
  onSelfImproveJarvis,
  onBatchUpgrade,
}: FleetAuditorProps) {
  const [selectedAuditReport, setSelectedAuditReport] = useState<any | null>(null);

  const getPriorityBadgeClass = (tier: string) => {
    if (tier.includes("P0")) return "bg-rose-950 text-rose-300 border-rose-500/50";
    if (tier.includes("P1")) return "bg-amber-950 text-amber-300 border-amber-500/50";
    if (tier.includes("P2")) return "bg-cyan-950 text-cyan-300 border-cyan-500/40";
    return "bg-gray-900 text-gray-400 border-gray-700";
  };

  return (
    <div className="space-y-4">
      {/* Fleet Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-sm font-bold tracking-wider text-cyan-300 uppercase">
              GitHub Fleet Portfolio & Health Matrix
            </h2>
            <p className="text-[11px] font-mono text-gray-400">
              AUTONOMOUS RESEARCH & MULTI-REPO CODEBASE HARVESTING
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {onBatchUpgrade && (
            <button
              type="button"
              onClick={onBatchUpgrade}
              disabled={isBatchUpgrading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-cyan-500/60 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-200 text-xs font-mono font-bold tracking-wider transition-all hover:scale-102 active:scale-98 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isBatchUpgrading ? "animate-spin" : ""}`} />
              {isBatchUpgrading ? "UPGRADING FLEET..." : "BATCH UPGRADE DEPS"}
            </button>
          )}

          <button
            type="button"
            onClick={onSelfImproveJarvis}
            disabled={isSelfImproving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-purple-500/80 bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 text-xs font-mono font-bold tracking-wider transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:scale-102 active:scale-98 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-purple-400 animate-spin" />
            {isSelfImproving ? "EVOLVING JARVIS CORE..." : "AUTONOMOUS SELF-IMPROVEMENT (P0)"}
          </button>
        </div>
      </div>

      {/* Repo Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {fleetRepos.map((repo) => (
          <div
            key={repo.name}
            className="border border-cyan-500/20 bg-[#030914]/80 rounded-xl p-4 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between hover:border-cyan-400/50 transition-colors shadow-[0_0_10px_rgba(0,0,0,0.5)]"
          >
            <div>
              {/* Card Header: Name & Priority */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="text-sm font-bold text-gray-100 flex items-center gap-1.5 truncate">
                    <span>{repo.name}</span>
                    {repo.html_url && (
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-500 hover:text-cyan-400 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </h3>
                  <span className="text-[10px] font-mono text-cyan-400">{repo.language || "Polyglot"}</span>
                </div>

                <span
                  className={`text-[9px] font-mono px-2 py-0.5 rounded border font-bold ${getPriorityBadgeClass(
                    repo.priority_tier
                  )}`}
                >
                  {repo.priority_tier}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-gray-400 font-mono mb-3 line-clamp-2">
                {repo.description || "Active production repository managed by Jarvis."}
              </p>
            </div>

            <div>
              {/* Health Score & Completion */}
              <div className="space-y-1.5 mb-3 border-t border-cyan-500/10 pt-2 font-mono text-[11px]">
                <div className="flex items-center justify-between text-gray-400">
                  <span>HEALTH SCORE</span>
                  <span className="text-emerald-400 font-bold">{repo.health_score}/100</span>
                </div>
                <div className="w-full bg-cyan-950/60 h-1 rounded overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full"
                    style={{ width: `${repo.health_score}%` }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onAuditRepo(repo.name)}
                  disabled={isAuditingRepo === repo.name}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded border border-cyan-500/30 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 text-xs font-mono font-semibold transition-colors"
                >
                  {isAuditingRepo === repo.name ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : null}
                  <span>{isAuditingRepo === repo.name ? "AUDITING..." : "DEEP AUDIT"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onImproveProject(repo.name)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded border border-purple-500/40 bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 text-xs font-mono font-semibold transition-colors hover:shadow-[0_0_8px_#a855f7]"
                >
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span>AUTO-IMPROVE</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Audit Report Modal */}
      {selectedAuditReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="border border-purple-500/50 bg-[#050b14] w-full max-w-2xl max-h-[80vh] rounded-xl flex flex-col shadow-[0_0_30px_rgba(168,85,247,0.2)] overflow-hidden">
            <div className="border-b border-purple-500/30 px-5 py-3.5 flex items-center justify-between bg-purple-950/30">
              <h3 className="text-sm font-bold text-purple-300 font-mono uppercase">
                Audit Report: {selectedAuditReport.repo_name}
              </h3>
              <button
                onClick={() => setSelectedAuditReport(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto font-mono text-xs text-gray-300 space-y-3">
              <p>Health Score: {selectedAuditReport.health_score}/100</p>
              <pre className="p-3 bg-black/50 rounded border border-purple-500/20 whitespace-pre-wrap">
                {JSON.stringify(selectedAuditReport.analysis || selectedAuditReport, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

