"use client";

import React, { useState } from "react";
import { X, FileCode, Copy, Check, Terminal } from "lucide-react";
import { hudSound } from "../../utils/sound";

interface DiffViewerModalProps {
  taskTitle: string;
  diffText: string;
  onClose: () => void;
}

export function DiffViewerModal({ taskTitle, diffText, onClose }: DiffViewerModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(diffText);
    setCopied(true);
    hudSound.playBlip();
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = diffText.split("\n");

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="border border-cyan-500/50 bg-[#050b14] w-full max-w-4xl max-h-[85vh] rounded-xl flex flex-col shadow-[0_0_30px_rgba(0,229,255,0.2)] overflow-hidden">
        {/* Header */}
        <div className="border-b border-cyan-500/30 px-5 py-3.5 flex items-center justify-between bg-cyan-950/30">
          <div className="flex items-center gap-2.5">
            <FileCode className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold tracking-wider text-cyan-300 uppercase">
                Interactive Git Diff Viewer
              </h3>
              <p className="text-xs text-gray-400 truncate max-w-md">{taskTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1 rounded border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 text-xs font-semibold hover:bg-cyan-900/60 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "COPIED" : "COPY DIFF"}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Diff Content */}
        <div className="flex-1 p-4 overflow-y-auto font-mono text-xs leading-relaxed space-y-0.5 select-text bg-[#03070d]">
          {lines.map((line, idx) => {
            let className = "text-gray-400";
            if (line.startsWith("+") && !line.startsWith("+++")) {
              className = "text-emerald-400 bg-emerald-950/30 px-1 rounded-sm";
            } else if (line.startsWith("-") && !line.startsWith("---")) {
              className = "text-rose-400 bg-rose-950/30 px-1 rounded-sm";
            } else if (line.startsWith("@@")) {
              className = "text-cyan-400 font-bold bg-cyan-950/40 px-1 py-0.5 my-1 block rounded";
            } else if (line.startsWith("diff --git") || line.startsWith("index")) {
              className = "text-amber-300 font-bold border-t border-white/5 pt-1 mt-1 block";
            }

            return (
              <div key={idx} className={`${className} whitespace-pre-wrap break-all flex`}>
                <span className="w-8 inline-block select-none text-gray-600 text-right pr-3 shrink-0">
                  {idx + 1}
                </span>
                <span>{line || " "}</span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-cyan-500/20 px-4 py-2 bg-cyan-950/20 flex items-center justify-between text-[11px] text-gray-500">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-cyan-400" />
            <span>Unified Diff format | Verified by LocalSandboxRunner</span>
          </div>
          <span>Total Lines: {lines.length}</span>
        </div>
      </div>
    </div>
  );
}

