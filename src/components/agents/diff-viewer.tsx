"use client";

import * as React from "react";
import {
  FileCode,
  AlertTriangle,
  FilePlus,
  FileMinus,
  FileText,
  Copy,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface DiffViewerProps {
  diffPatch?: string | null;
  additions?: number;
  deletions?: number;
  filesCount?: number;
  modifiedFiles?: string[];
  riskTier?: string;
  violations?: Array<{
    code: string;
    message: string;
    file?: string;
    severity: "blocker" | "warning";
  }>;
}

export function DiffViewer({
  diffPatch,
  additions = 0,
  deletions = 0,
  filesCount = 0,
  modifiedFiles = [],
  riskTier = "low",
  violations = [],
}: DiffViewerProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (!diffPatch) return;
    navigator.clipboard.writeText(diffPatch);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRiskBadge = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "extreme":
      case "high":
        return (
          <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/30 uppercase text-[10px]">
            {tier} Risk
          </Badge>
        );
      case "medium":
        return (
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 uppercase text-[10px]">
            Medium Risk
          </Badge>
        );
      case "low":
      default:
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 uppercase text-[10px]">
            Low Risk
          </Badge>
        );
    }
  };

  if (!diffPatch || diffPatch.trim().length === 0) {
    return (
      <div className="p-8 text-center bg-surface-1 border border-surface-3 rounded-lg">
        <FileCode className="w-10 h-10 text-text-secondary mx-auto mb-2 opacity-50" />
        <h4 className="text-sm font-semibold text-text-primary">No Git Diff Available</h4>
        <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
          This execution run did not generate or modify files, or no unified diff patch was recorded.
        </p>
      </div>
    );
  }

  const lines = diffPatch.split("\n");

  return (
    <div className="space-y-4">
      {/* Diff Metrics Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface-2/60 border border-surface-3 rounded-lg">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-text-primary font-medium">
            <FileText className="w-4 h-4 text-accent-cyan" />
            <span>
              {filesCount || modifiedFiles.length || 1} file
              {(filesCount || modifiedFiles.length || 1) > 1 ? "s" : ""} modified
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="flex items-center gap-0.5 text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              <FilePlus className="w-3 h-3" />
              +{additions}
            </span>
            <span className="flex items-center gap-0.5 text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
              <FileMinus className="w-3 h-3" />
              -{deletions}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-secondary">Risk Tier:</span>
            {getRiskBadge(riskTier)}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2.5 text-xs border-surface-3 bg-surface-2 hover:bg-surface-3 text-text-secondary hover:text-text-primary"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 mr-1 text-emerald-400" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 mr-1" />
              Copy Diff
            </>
          )}
        </Button>
      </div>

      {/* Violations Warning Banner */}
      {violations.length > 0 && (
        <div className="space-y-1.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
          <div className="flex items-center gap-1.5 font-semibold text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span>Diff Quality Concerns ({violations.length})</span>
          </div>
          <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-amber-200/90">
            {violations.map((v, i) => (
              <li key={i}>
                <span className="font-mono font-medium">[{v.code}]</span> {v.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Modified Files List */}
      {modifiedFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {modifiedFiles.map((file, idx) => (
            <span
              key={idx}
              className="text-[11px] font-mono bg-surface-2 text-text-primary px-2 py-0.5 rounded border border-surface-3 flex items-center gap-1"
            >
              <FileCode className="w-3 h-3 text-accent-cyan" />
              {file}
            </span>
          ))}
        </div>
      )}

      {/* Syntax-colored Unified Diff Viewer */}
      <div className="border border-surface-3 rounded-lg overflow-hidden bg-surface-base font-mono text-xs shadow-inner">
        <div className="overflow-x-auto max-h-[550px] p-3 leading-relaxed divide-y divide-surface-3/30">
          {lines.map((line, index) => {
            let lineClass = "text-text-secondary/80";
            let bgClass = "hover:bg-surface-2/40";

            if (line.startsWith("diff --git") || line.startsWith("index ")) {
              lineClass = "text-text-primary font-bold";
              bgClass = "bg-surface-2/60";
            } else if (line.startsWith("@@")) {
              lineClass = "text-cyan-400 font-semibold";
              bgClass = "bg-cyan-500/10";
            } else if (line.startsWith("+") && !line.startsWith("+++")) {
              lineClass = "text-emerald-400";
              bgClass = "bg-emerald-500/10";
            } else if (line.startsWith("-") && !line.startsWith("---")) {
              lineClass = "text-rose-400";
              bgClass = "bg-rose-500/10";
            }

            return (
              <div
                key={index}
                className={`flex items-start px-2 py-0.5 transition-colors ${bgClass}`}
              >
                <span className="w-10 select-none text-[10px] text-text-secondary/40 shrink-0 text-right pr-3 font-mono">
                  {index + 1}
                </span>
                <span className={`whitespace-pre-wrap break-all ${lineClass}`}>
                  {line || " "}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
