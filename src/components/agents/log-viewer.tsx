"use client";

import * as React from "react";
import { Terminal, Copy, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface LogViewerProps {
  logs?: string | null;
  errorSummary?: string | null;
  testResults?: {
    passed?: number;
    failed?: number;
    skipped?: number;
    durationMs?: number;
  } | null;
}

export function LogViewer({
  logs,
  errorSummary,
  testResults,
}: LogViewerProps) {
  const [copied, setCopied] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const combinedContent = React.useMemo(() => {
    const parts: string[] = [];

    if (errorSummary) {
      parts.push(`[FAILURE DIAGNOSTIC TRACE]\n${errorSummary}\n`);
    }

    if (testResults) {
      parts.push(
        `[TEST EXECUTION SUMMARY]\nPassed: ${testResults.passed ?? 0} | Failed: ${
          testResults.failed ?? 0
        } | Skipped: ${testResults.skipped ?? 0} | Duration: ${
          testResults.durationMs ?? 0
        }ms\n`
      );
    }

    if (logs) {
      parts.push(logs);
    }

    return parts.join("\n");
  }, [logs, errorSummary, testResults]);

  const handleCopy = () => {
    if (!combinedContent) return;
    navigator.clipboard.writeText(combinedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = React.useMemo(() => {
    if (!combinedContent) return [];
    return combinedContent.split("\n");
  }, [combinedContent]);

  const filteredLines = React.useMemo(() => {
    if (!search) return lines;
    return lines.filter((line) =>
      line.toLowerCase().includes(search.toLowerCase())
    );
  }, [lines, search]);

  if (!combinedContent || lines.length === 0) {
    return (
      <div className="p-8 text-center bg-surface-1 border border-surface-3 rounded-lg">
        <Terminal className="w-10 h-10 text-text-secondary mx-auto mb-2 opacity-50" />
        <h4 className="text-sm font-semibold text-text-primary">No Execution Logs Recorded</h4>
        <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
          This execution run did not emit standard output or error trace records.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5 bg-surface-2/60 border border-surface-3 rounded-lg">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
          <input
            type="text"
            placeholder="Search terminal logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs bg-surface-base border border-surface-3 rounded text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-1 focus:ring-accent-cyan font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-secondary font-mono">
            {filteredLines.length} lines
          </span>
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
                Copy Logs
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Terminal Display */}
      <div className="border border-surface-3 rounded-lg overflow-hidden bg-surface-base font-mono text-xs shadow-inner">
        <div className="bg-surface-2 px-3 py-1.5 border-b border-surface-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
            <span className="text-[10px] text-text-secondary ml-2 font-mono">stdout / stderr</span>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[550px] p-3 leading-relaxed">
          {filteredLines.map((line, index) => {
            let textColor = "text-text-secondary";
            if (line.includes("[FAILURE") || line.includes("Error:") || line.includes("FAILED")) {
              textColor = "text-rose-400 font-semibold";
            } else if (line.includes("[TEST") || line.includes("Passed:")) {
              textColor = "text-emerald-400 font-semibold";
            } else if (line.includes("warn") || line.includes("WARN")) {
              textColor = "text-amber-400";
            }

            return (
              <div key={index} className="flex items-start hover:bg-surface-2/30 px-1 py-0.5">
                <span className="w-9 select-none text-[10px] text-text-secondary/40 shrink-0 text-right pr-2">
                  {index + 1}
                </span>
                <span className={`whitespace-pre-wrap break-all ${textColor}`}>
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
