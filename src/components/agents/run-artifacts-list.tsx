"use client";

import * as React from "react";
import {
  FileArchive,
  FileCode,
  Copy,
  Check,
  Hash,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface RunArtifactItem {
  id: string;
  run_id: string;
  artifact_type: string;
  storage_path: string;
  file_size_bytes: number;
  mime_type: string;
  checksum_sha256: string;
  created_at?: string;
}

export interface RunArtifactsListProps {
  artifacts: RunArtifactItem[];
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function RunArtifactsList({ artifacts }: RunArtifactsListProps) {
  const [copiedHash, setCopiedHash] = React.useState<string | null>(null);

  const handleCopyChecksum = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  if (!artifacts || artifacts.length === 0) {
    return (
      <div className="p-8 text-center bg-surface-1 border border-surface-3 rounded-lg">
        <FileArchive className="w-10 h-10 text-text-secondary mx-auto mb-2 opacity-50" />
        <h4 className="text-sm font-semibold text-text-primary">No Artifacts Attached</h4>
        <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
          This execution run did not generate or register any output artifacts, diff bundles, or test logs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-text-secondary font-medium">
        Attached Execution Artifacts ({artifacts.length})
      </div>

      <div className="grid grid-cols-1 gap-3">
        {artifacts.map((artifact) => {
          const fileName = artifact.storage_path.split("/").pop() || artifact.storage_path;
          const isCopied = copiedHash === artifact.checksum_sha256;

          return (
            <Card
              key={artifact.id}
              className="border-surface-3 bg-surface-1 hover:border-surface-3/80 transition-colors"
            >
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <FileCode className="w-4 h-4 text-accent-cyan shrink-0" />
                    <span className="text-xs sm:text-sm font-semibold font-mono text-text-primary truncate">
                      {fileName}
                    </span>
                    <Badge
                      variant="outline"
                      className="bg-surface-2 border-surface-3 text-text-secondary text-[10px] uppercase font-mono"
                    >
                      {artifact.artifact_type}
                    </Badge>
                    <span className="text-xs text-text-secondary font-mono">
                      {formatBytes(artifact.file_size_bytes)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary font-mono">
                    <span className="truncate max-w-xs sm:max-w-md">
                      Path: {artifact.storage_path}
                    </span>
                    <span>MIME: {artifact.mime_type}</span>
                  </div>

                  {artifact.checksum_sha256 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-text-secondary/80 font-mono">
                      <Hash className="w-3 h-3 text-accent-cyan shrink-0" />
                      <span className="truncate">
                        SHA-256: {artifact.checksum_sha256}
                      </span>
                      <button
                        onClick={() => handleCopyChecksum(artifact.checksum_sha256)}
                        className="text-accent-cyan hover:underline ml-1 inline-flex items-center gap-0.5"
                        aria-label="Copy SHA-256 checksum"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 text-[10px]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span className="text-[10px]">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
