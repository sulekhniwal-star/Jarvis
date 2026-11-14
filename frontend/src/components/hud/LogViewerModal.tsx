"use client";

import React, { useState } from "react";
import { Terminal, X, Copy, Check } from "lucide-react";
import { hudSound } from "../../utils/sound";
import { TaskItem } from "../../utils/api";

interface LogViewerModalProps {
  task: TaskItem;
  onClose: () => void;
}

export function LogViewerModal({ task, onClose }: LogViewerModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = task.logs ? task.logs.join("\n") : "";
    navigator.clipboard.writeText(text);
    setCopied(true);
    hudSound.playBlip();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="border border-cyan-500/50 bg-[#050b14] w-full max-w-3xl max-h-[80vh] rounded-xl flex flex-col shadow-[0_0_30px_rgba(0,229,255,0.2)] overflow-hidden">
        {/* Header */}
        <div className="border-b border-cyan-500/30 px-5 py-3.5 flex items-center justify-between bg-cyan-950/30">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold tracking-wider text-cyan-300 uppercase">
                Telemetry Log Terminal
              </h3>
              <p className="text-xs text-gray-400 truncate max-w-sm">{task.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1 rounded border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 text-xs font-semibold hover:bg-cyan-900/60 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "COPIED" : "COPY LOGS"}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Logs Stream */}
        <div className="flex-1 p-4 overflow-y-auto font-mono text-xs leading-relaxed space-y-2 select-text bg-[#03070d]">
          {task.logs && task.logs.length > 0 ? (
            task.logs.map((log, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="text-cyan-600 select-none">&gt;</span>
                <span
                  className={
                    log.includes("COMPLETED") || log.includes("✅")
                      ? "text-emerald-400"
                      : log.includes("FAILED") || log.includes("❌")
                      ? "text-rose-400 font-semibold"
                      : log.includes("Step")
                      ? "text-cyan-300"
                      : "text-gray-300"
                  }
                >
                  {log}
                </span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 italic">No telemetry logs recorded for this mission.</p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-cyan-500/20 px-4 py-2 bg-cyan-950/20 flex items-center justify-between text-[11px] text-gray-500 font-mono">
          <span>MISSION ID: {task.id}</span>
          <span>STATUS: {task.status}</span>
        </div>
      </div>
    </div>
  );
}

