"use client";

import React from "react";
import { Play, Sparkles, Sliders } from "lucide-react";

interface TaskIntakeFormProps {
  taskTitle: string;
  setTaskTitle: (val: string) => void;
  taskDesc: string;
  setTaskDesc: (val: string) => void;
  priority: string;
  setPriority: (val: string) => void;
  isEmergencyLocked: boolean;
  isDispatching: boolean;
  handleCreateTask: () => void;
}

export function TaskIntakeForm({
  taskTitle,
  setTaskTitle,
  taskDesc,
  setTaskDesc,
  priority,
  setPriority,
  isEmergencyLocked,
  isDispatching,
  handleCreateTask,
}: TaskIntakeFormProps) {
  return (
    <div className="border border-cyan-500/40 bg-black/60 rounded-xl p-5 backdrop-blur-md relative overflow-hidden shadow-[0_0_20px_rgba(0,229,255,0.1)]">
      <div className="flex items-center justify-between mb-4 border-b border-cyan-500/20 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-bold tracking-wider text-cyan-300 uppercase">
            Mission Dispatch // Task Intake
          </h2>
        </div>
        <span className="text-[10px] font-mono text-cyan-500">AUTONOMOUS ORCHESTRATOR</span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-mono text-gray-400 mb-1">
            MISSION DIRECTIVE / OBJECTIVE
          </label>
          <input
            type="text"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            disabled={isEmergencyLocked || isDispatching}
            placeholder="e.g. Fix memory leak in buffer pool & author tests"
            className="w-full bg-[#030a14] border border-cyan-500/30 rounded px-3 py-2 text-sm text-cyan-200 placeholder-gray-600 focus:outline-none focus:border-cyan-400 transition-colors font-mono"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-gray-400 mb-1">
            TECHNICAL CONTEXT / SPECIFICATIONS
          </label>
          <textarea
            value={taskDesc}
            onChange={(e) => setTaskDesc(e.target.value)}
            disabled={isEmergencyLocked || isDispatching}
            rows={3}
            placeholder="Describe affected files, expected behavior, constraints, or bug reproduction steps..."
            className="w-full bg-[#030a14] border border-cyan-500/30 rounded px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-cyan-400 transition-colors font-mono resize-none"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-500" />
            <span className="text-xs font-mono text-gray-400">PRIORITY TIER:</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={isEmergencyLocked || isDispatching}
              className="bg-[#030a14] border border-cyan-500/30 rounded px-2.5 py-1 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-400"
            >
              <option value="CRITICAL">DEFCON 1 (CRITICAL)</option>
              <option value="HIGH">STRATEGIC (HIGH)</option>
              <option value="TACTICAL (MEDIUM)">TACTICAL (MEDIUM)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleCreateTask}
            disabled={
              !taskTitle.trim() || !taskDesc.trim() || isEmergencyLocked || isDispatching
            }
            className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded font-mono text-xs font-bold tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(0,229,255,0.3)] ${
              !taskTitle.trim() || !taskDesc.trim() || isEmergencyLocked || isDispatching
                ? "bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed"
                : "bg-cyan-500 hover:bg-cyan-400 text-black border border-cyan-300 hover:shadow-[0_0_20px_#00e5ff] hover:scale-102 active:scale-98"
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isDispatching ? "DISPATCHING..." : "DISPATCH MISSION"}
          </button>
        </div>
      </div>
    </div>
  );
}

