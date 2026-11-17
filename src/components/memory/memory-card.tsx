"use client";

import * as React from "react";
import Link from "next/link";
import {
  Copy,
  Check,
  Trash2,
  Folder,
  Globe,
  Clock,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MemoryCategoryBadge } from "./memory-category-badge";
import { MemoryCategory, Json } from "@/types/database";

export interface MemoryItem {
  id: string;
  user_id: string;
  project_id: string | null;
  category: MemoryCategory;
  content: string;
  metadata?: Json;
  created_at: string;
  similarity?: number;
  projectName?: string;
}

export interface MemoryCardProps {
  memory: MemoryItem;
  onDelete?: (id: string) => Promise<void> | void;
}

export function MemoryCard({ memory, onDelete }: MemoryCardProps) {
  const [copied, setCopied] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(memory.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    if (onDelete) {
      setIsDeleting(true);
      try {
        await onDelete(memory.id);
      } finally {
        setIsDeleting(false);
        setConfirmDelete(false);
      }
    }
  };

  return (
    <Card className="border-surface-3 bg-surface-1 hover:border-surface-3/80 transition-all flex flex-col justify-between group">
      <CardContent className="p-4 space-y-3">
        {/* Header: Category Badge + Project/Similarity Tag + Copy */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <MemoryCategoryBadge category={memory.category} />
            {memory.similarity !== undefined && (
              <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 font-mono text-[10px] flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {Math.round(memory.similarity * 100)}% match
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-7 w-7 p-0 border-surface-3 bg-surface-2 hover:bg-surface-3 text-text-secondary hover:text-text-primary"
              aria-label="Copy memory content"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Content Body */}
        <p className="text-xs sm:text-sm text-text-primary leading-relaxed whitespace-pre-wrap font-sans">
          {memory.content}
        </p>

        {/* Footer: Project context, timestamp & delete */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-3/50 text-[11px] text-text-secondary">
          <div className="flex items-center gap-3">
            {memory.project_id ? (
              <div className="flex items-center gap-1 text-text-secondary">
                <Folder className="w-3 h-3 text-accent-cyan" />
                <Link
                  href={`/projects/${memory.project_id}`}
                  className="hover:underline hover:text-text-primary truncate max-w-[130px]"
                >
                  {memory.projectName || "Project"}
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-text-secondary/70">
                <Globe className="w-3 h-3 text-text-secondary" />
                <span>Global Memory</span>
              </div>
            )}

            <div className="flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3 text-text-secondary/70" />
              <span>{new Date(memory.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {onDelete && (
            <div className="flex items-center gap-1">
              {confirmDelete ? (
                <div className="flex items-center gap-1 animate-in fade-in duration-150">
                  <button
                    onClick={() => void handleDelete()}
                    disabled={isDeleting}
                    className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30"
                  >
                    {isDeleting ? "Deleting..." : "Confirm"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-1.5 py-0.5 rounded text-[11px] text-text-secondary hover:text-text-primary"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="p-1 rounded text-text-secondary/60 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Delete memory"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

