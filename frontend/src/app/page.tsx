"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Play,
  Lock,
  ThumbsUp,
  ThumbsDown,
  Terminal,
  Activity,
  Zap,
  Wifi,
  Radio,
  Cpu,
  Database,
  Crosshair,
  Volume2,
  VolumeX,
  X,
  RefreshCw,
  Sliders,
  ChevronRight,
  Disc,
} from "lucide-react";
import { hudSound } from "../utils/sound";

export default function DashboardPage() {
  // Task Intake State
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [priority, setPriority] = useState("TACTICAL (MEDIUM)");
  const [isEmergencyLocked, setIsEmergencyLocked] = useState(false);
  const [selectedLogsTask, setSelectedLogsTask] = useState<any | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hudMode, setHudMode] = useState<"TACTICAL" | "SURGE" | "STEALTH">("TACTICAL");

  // Real-time Clock
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}:${seconds}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Approvals State
  const [pendingApprovals, setPendingApprovals] = useState([
    {
      id: "appr-001",
      task_id: "task-002",
      action_type: "DEPLOY_PULL_REQUEST",
      payload_hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      summary: "Deploy Pull Request #42 into production repository branch.",
      expires_in: "24m",
    },
  ]);

  // Tasks State
  const [tasks, setTasks] = useState([
    {
      id: "TASK-001",
      title: "Initialize Repository & CI Architecture",
      status: "COMPLETED",
      priority: "HIGH",
      stepsCount: 5,
      completedSteps: 5,
      logs: [
        "[00:01] System boot verified. Environment: isolated sandbox.",
        "[00:02] Tool: repo_inspect -> Directory structure analyzed.",
        "[00:03] Tool: file_edit -> Generated GitHub Actions CI workflow.",
        "[00:04] Tool: test_runner -> Executed pytest suite. 46 passed.",
        "[00:05] Status: Exit code 0. Pull Request #41 merged cleanly.",
      ],
    },
    {
      id: "TASK-002",
      title: "Deploy Pull Request with Test Badges",
      status: "AWAITING_APPROVAL",
      priority: "CRITICAL",
      stepsCount: 5,
      completedSteps: 3,
      logs: [
        "[00:01] Tool: repo_inspect -> Validated test badge configuration.",
        "[00:02] Tool: file_edit -> Updated README with CI badges.",
        "[00:03] Tool: test_runner -> Verification tests passed.",
        "[00:04] ACTION_GATED: Deployment requires authorized owner approval.",
      ],
    },
  ]);

  const handleCreateTask = () => {
    if (!taskTitle.trim() || !taskDesc.trim() || isEmergencyLocked) return;
    hudSound.playDispatch();
    const newTask = {
      id: `TASK-${Math.floor(100 + Math.random() * 900)}`,
      title: taskTitle,
      status: "IN_PROGRESS",
      priority: priority,
      stepsCount: 4,
      completedSteps: 1,
      logs: [
        `[00:01] Task queued by Stark Interface. Priority: ${priority}`,
        `[00:02] Tool: repo_inspect -> Scanning workspace codebase...`,
      ],
    };
    setTasks([newTask, ...tasks]);
    setTaskTitle("");
    setTaskDesc("");
  };

  const handleApprovalDecision = (id: string, decision: "APPROVED" | "REJECTED") => {
    hudSound.playBlip();
    setPendingApprovals(pendingApprovals.filter((a) => a.id !== id));
    setTasks(
      tasks.map((t) =>
        t.status === "AWAITING_APPROVAL"
          ? {
              ...t,
              status: decision === "APPROVED" ? "COMPLETED" : "FAILED",
              completedSteps: decision === "APPROVED" ? 5 : 3,
              logs: [
                ...t.logs,
                `[00:05] Human Authorization: ${decision}. Action completed.`,
              ],
            }
          : t
      )
    );
  };

  const handleEmergencyStop = () => {
    hudSound.playEmergency();
    setIsEmergencyLocked(true);
    setTasks(
      tasks.map((t) =>
        t.status !== "COMPLETED"
          ? {
              ...t,
              status: "CANCELLED",
              logs: [...t.logs, "[EMERGENCY_LOCKDOWN] System kill-switch triggered."],
            }
          : t
      )
    );
    setPendingApprovals([]);
  };

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    hudSound.enabled = newState;
    if (newState) hudSound.playBlip();
  };

  return (
    <div className="space-y-6 pb-20 select-none">
      {/* ========================================================================= */}
      {/* 1. TOP TELEMETRY HUD BAR (Gauges, Power, Live Clock, Defcon) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Arc Energy Core */}
        <div className="tech-border p-3 rounded-lg flex items-center gap-3">
          <div className="relative w-10 h-10 flex-shrink-0 flex items-center justify-center">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-cyan-950 stroke-current"
                strokeWidth="3.5"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-cyan-400 stroke-current animate-pulse-energy"
                strokeDasharray="100, 100"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <Zap className="w-4 h-4 text-cyan-300 absolute" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-cyan-500">
              CORE ENERGY
            </p>
            <p className="text-base font-extrabold font-mono text-cyan-300 glow-cyan">
              100% PURE
            </p>
          </div>
        </div>

        {/* Quantum CPU Compute */}
        <div className="tech-border p-3 rounded-lg flex items-center gap-3">
          <div className="w-10 h-10 rounded border border-cyan-500/40 bg-cyan-950/40 flex items-center justify-center flex-shrink-0">
            <Cpu className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="w-full">
            <div className="flex justify-between items-center text-[10px] font-mono text-cyan-500">
              <span>CPU LOAD</span>
              <span className="text-cyan-300 font-bold">38%</span>
            </div>
            <div className="w-full bg-cyan-950 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                className="bg-cyan-400 h-full rounded-full shadow-[0_0_8px_#00f0ff]"
                style={{ width: "38%" }}
              />
            </div>
            <span className="text-[9px] font-mono text-cyan-600 block mt-0.5">
              16 THREADS ACTIVE
            </span>
          </div>
        </div>

        {/* Neural Memory Cache */}
        <div className="tech-border p-3 rounded-lg flex items-center gap-3">
          <div className="w-10 h-10 rounded border border-cyan-500/40 bg-cyan-950/40 flex items-center justify-center flex-shrink-0">
            <Database className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-cyan-500">
              NEURAL MEMORY
            </p>
            <p className="text-base font-bold font-mono text-cyan-200">
              18.9 / 64 GB
            </p>
            <span className="text-[9px] font-mono text-cyan-600">
              POSTGRES RLS ACTIVE
            </span>
          </div>
        </div>

        {/* Uplink / Downlink Bandwidth */}
        <div className="tech-border p-3 rounded-lg flex items-center gap-3">
          <div className="w-10 h-10 rounded border border-cyan-500/40 bg-cyan-950/40 flex items-center justify-center flex-shrink-0">
            <Wifi className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-cyan-500">
              DATA TELEMETRY
            </p>
            <p className="text-xs font-mono font-bold text-cyan-300">
              ▲ 142 KB/s
            </p>
            <p className="text-xs font-mono font-bold text-cyan-400">
              ▼ 2.4 MB/s
            </p>
          </div>
        </div>

        {/* Token Budget / Cost Control */}
        <div className="tech-border p-3 rounded-lg flex items-center gap-3">
          <div className="w-10 h-10 rounded border border-cyan-500/40 bg-cyan-950/40 flex items-center justify-center flex-shrink-0">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-cyan-500">
              MONTHLY BUDGET
            </p>
            <p className="text-base font-extrabold font-mono text-emerald-400">
              ₹0 / ₹1,000
            </p>
            <span className="text-[9px] font-mono text-cyan-600">
              COST CEILING LOCKED
            </span>
          </div>
        </div>

        {/* System Defense State / Clock */}
        <div
          className={`tech-border p-3 rounded-lg flex items-center gap-3 ${
            isEmergencyLocked
              ? "border-rose-500/80 bg-rose-950/40 glow-rose-box"
              : "border-cyan-500/40"
          }`}
        >
          <div className="w-10 h-10 rounded border border-cyan-500/40 bg-cyan-950/40 flex items-center justify-center flex-shrink-0">
            <Radio
              className={`w-5 h-5 ${
                isEmergencyLocked ? "text-rose-400 animate-bounce" : "text-cyan-400"
              }`}
            />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-cyan-500">
              DEFCON // CLOCK
            </p>
            <p
              className={`text-sm font-extrabold font-mono tracking-wider ${
                isEmergencyLocked ? "text-rose-400 glow-rose" : "text-cyan-300 glow-cyan"
              }`}
            >
              {isEmergencyLocked ? "DEFCON 1: LOCKED" : "DEFCON 4: NOMINAL"}
            </p>
            <span className="text-[11px] font-mono font-bold text-cyan-400">
              {currentTime || "22:38:00"}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CENTRAL HOLOGRAPHIC HUD / ARC REACTOR CENTERPIECE */}
      {/* ========================================================================= */}
      <div className="tech-border rounded-xl p-5 lg:p-7 relative overflow-hidden bg-gradient-to-b from-[#021024]/80 via-[#010915]/90 to-[#020b18]/80">
        {/* Background Scanline Overlay */}
        <div className="absolute inset-0 scanlines opacity-40 pointer-events-none" />

        {/* Corner HUD Markers */}
        <div className="absolute top-2 left-3 text-[9px] font-mono text-cyan-500/60">
          [TARGET_LOC: 88.205.188.122 // SEC_ID: 9132575391]
        </div>
        <div className="absolute top-2 right-3 text-[9px] font-mono text-cyan-500/60">
          [MARK_LXXXV_STARK_CORE // TELEMETRY_ONLINE]
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center relative z-10">
          {/* Left Wing Diagnostics */}
          <div className="space-y-3 font-mono text-xs hidden lg:block">
            <div className="border-l-2 border-cyan-400 pl-3 py-1 bg-cyan-950/20">
              <span className="text-[10px] text-cyan-500 uppercase tracking-widest block">
                SYSTEM DIAGNOSTICS
              </span>
              <span className="text-cyan-300 font-bold tracking-wider">
                NEURAL OVERWATCH SYNCHRONIZED
              </span>
              <p className="text-[11px] text-cyan-600 mt-1">
                LangGraph Checkpointer: Active // OpenRouter: Ready
              </p>
            </div>

            <div className="border-l-2 border-cyan-500/40 pl-3 py-1 bg-cyan-950/10">
              <span className="text-[10px] text-cyan-500 uppercase tracking-widest block">
                AUXILIARY SYSTEMS
              </span>
              <div className="flex items-center gap-2 text-cyan-300 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span>TELEGRAM BOT: @SulekhBot ONLINE</span>
              </div>
            </div>

            {/* Audio Waveform Simulator */}
            <div className="pt-2">
              <span className="text-[10px] text-cyan-500 tracking-widest uppercase block mb-1">
                VOICE SYNTHESIS FREQUENCY
              </span>
              <div className="flex items-end gap-1 h-8 bg-cyan-950/40 p-1.5 rounded border border-cyan-500/30">
                {[40, 70, 25, 90, 60, 30, 85, 95, 50, 65, 80, 45, 90, 35, 75, 55].map(
                  (val, idx) => (
                    <div
                      key={idx}
                      className="w-full bg-cyan-400/80 rounded-t shadow-[0_0_4px_#00f0ff] transition-all duration-300"
                      style={{
                        height: `${val}%`,
                        opacity: 0.5 + (idx % 3) * 0.2,
                      }}
                    />
                  )
                )}
              </div>
            </div>
          </div>

          {/* Central Rotating Holographic HUD Circle */}
          <div className="flex flex-col items-center justify-center relative">
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
              {/* Outer Ring with Degree Ticks */}
              <div className="absolute inset-0 rounded-full border border-cyan-500/30 border-dashed animate-spin-slow" />
              
              {/* Middle Segmented Ring */}
              <div className="absolute w-48 h-48 sm:w-56 sm:h-56 rounded-full border-2 border-cyan-400/40 border-t-cyan-300 border-b-cyan-300 animate-spin-reverse" />
              
              {/* Concentric Reticle Ring */}
              <div className="absolute w-40 h-40 sm:w-48 sm:h-48 rounded-full border border-cyan-400/60 border-l-transparent border-r-transparent animate-spin-slow" />

              {/* Crosshair Lines */}
              <div className="absolute w-full h-px bg-cyan-500/20" />
              <div className="absolute h-full w-px bg-cyan-500/20" />

              {/* Radar Sweep Arc */}
              <div className="absolute inset-4 rounded-full border border-cyan-400/20 overflow-hidden pointer-events-none">
                <div className="w-full h-full bg-gradient-to-tr from-cyan-400/25 via-transparent to-transparent animate-radar origin-center" />
              </div>

              {/* Core Arc Reactor Center */}
              <div className="relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#020b18]/90 border-2 border-cyan-300 flex flex-col items-center justify-center shadow-[0_0_25px_rgba(0,240,255,0.45)] group cursor-pointer">
                <div className="absolute inset-1 rounded-full border border-cyan-400/40 animate-ping opacity-25" />
                <Disc className="w-8 h-8 text-cyan-300 animate-spin-slow mb-0.5" />
                <span className="text-[13px] font-black font-mono tracking-widest text-cyan-200 glow-cyan">
                  J.A.R.V.I.S.
                </span>
                <span className="text-[9px] font-mono text-cyan-400 tracking-wider">
                  FLIGHT READY
                </span>
              </div>
            </div>

            {/* Sub-label */}
            <div className="mt-3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-mono text-cyan-400 font-bold tracking-widest">
                MARK LXXXV DEFENSE FRAMEWORK
              </span>
            </div>
          </div>

          {/* Right Wing Diagnostics & Mode Selector */}
          <div className="space-y-3 font-mono text-xs">
            <div className="border-r-2 border-cyan-400 pr-3 py-1 bg-cyan-950/20 text-right">
              <span className="text-[10px] text-cyan-500 uppercase tracking-widest block">
                TARGET IDENTIFIER
              </span>
              <span className="text-cyan-300 font-bold tracking-wider">
                SULEKH NIWAL // OWNER CONFIRMED
              </span>
              <p className="text-[11px] text-cyan-600 mt-1">
                Security Clearance: Level 10 (Supreme)
              </p>
            </div>

            {/* Protocol Mode Switcher */}
            <div className="bg-cyan-950/30 border border-cyan-500/30 p-2.5 rounded-lg space-y-2">
              <span className="text-[10px] text-cyan-500 uppercase tracking-wider block">
                PROTOCOL OPERATIONAL MODE
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(["TACTICAL", "SURGE", "STEALTH"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      hudSound.playModeSwitch();
                      setHudMode(mode);
                    }}
                    className={`py-1 text-[10px] font-bold rounded transition-all ${
                      hudMode === mode
                        ? "bg-cyan-400 text-slate-950 shadow-[0_0_8px_#00f0ff]"
                        : "bg-cyan-950/60 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-900/50"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-r-2 border-cyan-500/40 pr-3 py-1 bg-cyan-950/10 text-right">
              <span className="text-[10px] text-cyan-500 uppercase tracking-widest block">
                INTELLIGENCE PROVIDER
              </span>
              <span className="text-cyan-300 font-bold">
                OPENROUTER // AUTO NEURAL ROUTE
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. HUMAN APPROVAL REQUIRED (High-Priority Action Gating) */}
      {/* ========================================================================= */}
      {pendingApprovals.length > 0 && (
        <div className="tech-border border-amber-500/60 bg-amber-950/30 rounded-xl p-4 lg:p-5 space-y-3 glow-amber-box">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Lock className="w-5 h-5 text-amber-400 animate-bounce" />
              <h2 className="font-extrabold text-amber-200 tracking-wider font-mono text-sm uppercase">
                SECURITY INTERCEPT // HUMAN AUTHORIZATION REQUIRED
              </h2>
            </div>
            <span className="text-xs bg-amber-900/60 text-amber-300 border border-amber-500/50 px-2 py-0.5 rounded font-mono">
              HITL LEVEL-1 GATED
            </span>
          </div>

          {pendingApprovals.map((appr) => (
            <div
              key={appr.id}
              className="bg-[#020b18]/90 border border-amber-500/40 rounded-lg p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-400 tracking-wider">
                    {appr.action_type}
                  </span>
                  <span className="text-xs text-cyan-500">
                    EXPIRES IN: {appr.expires_in}
                  </span>
                </div>
                <p className="text-xs text-slate-200">{appr.summary}</p>
                <p className="text-[11px] text-cyan-600">
                  PAYLOAD SHA-256: {appr.payload_hash.slice(0, 24)}...
                </p>
              </div>
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <button
                  onClick={() => handleApprovalDecision(appr.id, "APPROVED")}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs shadow-[0_0_10px_#00f0ff] transition-all"
                >
                  <ThumbsUp className="w-3.5 h-3.5" /> AUTHORIZE
                </button>
                <button
                  onClick={() => handleApprovalDecision(appr.id, "REJECTED")}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-600/60 font-bold text-xs transition-all"
                >
                  <ThumbsDown className="w-3.5 h-3.5" /> ABORT
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MAIN TACTICAL GRID (Intake Form & Autonomous Mission Queue) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Task Submission Form */}
        <div className="tech-border rounded-xl p-4 lg:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2.5">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-cyan-400" />
              <h2 className="font-extrabold text-cyan-300 tracking-wider font-mono text-sm uppercase">
                TACTICAL TASK DISPATCH
              </h2>
            </div>
            <span className="text-[10px] font-mono text-cyan-500">AUTONOMOUS</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <label className="text-[11px] text-cyan-400 block mb-1">
                ASSIGNMENT TITLE
              </label>
              <input
                type="text"
                placeholder="e.g. Implement user profile endpoint"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                disabled={isEmergencyLocked}
                className="w-full px-3 py-2 bg-[#020b18] border border-cyan-500/40 rounded text-cyan-100 text-xs placeholder:text-cyan-700 focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_8px_#00f0ff] disabled:opacity-40"
              />
            </div>

            <div>
              <label className="text-[11px] text-cyan-400 block mb-1">
                TECHNICAL REQUIREMENTS & SCOPE
              </label>
              <textarea
                rows={4}
                placeholder="Define architecture requirements, target files, and test specifications..."
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                disabled={isEmergencyLocked}
                className="w-full px-3 py-2 bg-[#020b18] border border-cyan-500/40 rounded text-cyan-100 text-xs placeholder:text-cyan-700 focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_8px_#00f0ff] disabled:opacity-40"
              />
            </div>

            <div>
              <label className="text-[11px] text-cyan-400 block mb-1">
                PRIORITY PROTOCOL
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={isEmergencyLocked}
                className="w-full px-3 py-2 bg-[#020b18] border border-cyan-500/40 rounded text-cyan-100 text-xs focus:outline-none focus:border-cyan-300 disabled:opacity-40"
              >
                <option value="LOW">LOW — BACKGROUND THREAD</option>
                <option value="TACTICAL (MEDIUM)">TACTICAL (MEDIUM) — STANDARD OPERATION</option>
                <option value="HIGH">HIGH — RAPID COMPLETION</option>
                <option value="CRITICAL">DEFCON 1 (CRITICAL) — MAXIMUM ALLOCATION</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleCreateTask}
              disabled={isEmergencyLocked || !taskTitle.trim() || !taskDesc.trim()}
              className="w-full py-2.5 px-4 rounded bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition-all shadow-[0_0_12px_#00f0ff] disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              DISPATCH PROTOCOL
            </button>
          </div>
        </div>

        {/* Right Column: Mission Manifest & Task Queue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2.5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h2 className="font-extrabold text-cyan-300 tracking-wider font-mono text-sm uppercase">
                AUTONOMOUS MISSION MANIFEST ({tasks.length})
              </h2>
            </div>
            <span className="text-[10px] font-mono text-cyan-500">
              REAL-TIME EXECUTION
            </span>
          </div>

          <div className="space-y-3 font-mono">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="tech-border rounded-lg p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-cyan-400/60 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-cyan-500 font-bold">{task.id}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-extrabold border uppercase tracking-wider ${
                        task.status === "COMPLETED"
                          ? "bg-cyan-950 text-cyan-300 border-cyan-400 shadow-[0_0_6px_#00f0ff]"
                          : task.status === "AWAITING_APPROVAL"
                          ? "bg-amber-950 text-amber-300 border-amber-500 animate-pulse"
                          : task.status === "CANCELLED"
                          ? "bg-rose-950 text-rose-400 border-rose-800"
                          : "bg-cyan-950/80 text-cyan-400 border-cyan-600 animate-pulse"
                      }`}
                    >
                      {task.status}
                    </span>
                    <span className="text-[10px] text-cyan-600">
                      // {task.priority}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-cyan-100">
                    {task.title}
                  </p>

                  {/* Step Progress Bar */}
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-cyan-500">
                    <span>
                      STEPS: {task.completedSteps}/{task.stepsCount}
                    </span>
                    <div className="w-32 bg-cyan-950 h-1.5 rounded-full overflow-hidden border border-cyan-500/20">
                      <div
                        className="bg-cyan-400 h-full rounded-full transition-all duration-500 shadow-[0_0_6px_#00f0ff]"
                        style={{
                          width: `${(task.completedSteps / task.stepsCount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      hudSound.playBlip();
                      setSelectedLogsTask(task);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 text-xs font-semibold transition-all hover:shadow-[0_0_8px_#00f0ff]"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    INSPECT LOGS
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Stark Protocol Emergency Kill-Switch */}
          <div className="border border-rose-500/60 bg-rose-950/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 glow-rose-box">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-rose-400 animate-pulse flex-shrink-0" />
              <div>
                <p className="text-xs font-mono font-extrabold text-rose-300 uppercase tracking-wider">
                  DEFENSE PROTOCOL // EMERGENCY KILL-SWITCH
                </p>
                <p className="text-[11px] text-rose-300/70 font-mono">
                  Immediately aborts active workers, revokes temporary tokens, and purges sandbox execution environments.
                </p>
              </div>
            </div>
            <button
              onClick={handleEmergencyStop}
              disabled={isEmergencyLocked}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-mono font-black text-xs rounded uppercase tracking-wider transition-all shadow-[0_0_12px_#f43f5e] disabled:opacity-50 whitespace-nowrap"
            >
              {isEmergencyLocked ? "SYSTEM LOCKED" : "ENGAGE LOCKDOWN"}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. BOTTOM HOLOGRAPHIC DOCK (Directly inspired by Iron Man HUD Dock) */}
      {/* ========================================================================= */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 bg-[#020b18]/90 border border-cyan-500/40 backdrop-blur-md px-4 py-2 rounded-full shadow-[0_0_20px_rgba(0,240,255,0.25)] flex items-center gap-3 sm:gap-4">
        {[
          { icon: Disc, label: "Core" },
          { icon: Crosshair, label: "Target" },
          { icon: Activity, label: "Radar" },
          { icon: Database, label: "Memory" },
          { icon: Cpu, label: "Quantum" },
          { icon: Sliders, label: "Params" },
        ].map((item, idx) => (
          <button
            key={idx}
            onClick={() => hudSound.playBlip()}
            title={item.label}
            className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-cyan-400/50 bg-cyan-950/50 hover:bg-cyan-900/80 flex items-center justify-center text-cyan-300 transition-all hover:scale-110 hover:shadow-[0_0_10px_#00f0ff] group"
          >
            <div className="absolute inset-0 rounded-full border border-cyan-300/30 group-hover:animate-spin-slow pointer-events-none" />
            <item.icon className="w-4 h-4" />
          </button>
        ))}

        <div className="w-px h-6 bg-cyan-500/40" />

        {/* Audio Mute/Unmute Control */}
        <button
          onClick={toggleSound}
          title={soundEnabled ? "Mute HUD Audio" : "Unmute HUD Audio"}
          className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-cyan-400/50 bg-cyan-950/50 hover:bg-cyan-900/80 flex items-center justify-center text-cyan-300 transition-all hover:scale-110"
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4 text-cyan-300 animate-pulse" />
          ) : (
            <VolumeX className="w-4 h-4 text-slate-500" />
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 6. HOLOGRAPHIC TERMINAL LOGS MODAL */}
      {/* ========================================================================= */}
      {selectedLogsTask && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="tech-border bg-[#010915] rounded-xl max-w-2xl w-full p-5 space-y-4 glow-cyan-box relative">
            <div className="flex items-center justify-between border-b border-cyan-500/40 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-cyan-400" />
                <h3 className="font-mono font-bold text-sm text-cyan-200 tracking-wider">
                  TELEMETRY LOGS // {selectedLogsTask.id}
                </h3>
              </div>
              <button
                onClick={() => {
                  hudSound.playBlip();
                  setSelectedLogsTask(null);
                }}
                className="text-cyan-500 hover:text-cyan-300 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#020b18] border border-cyan-500/30 rounded p-4 font-mono text-xs text-cyan-300 space-y-1.5 max-h-72 overflow-y-auto">
              {selectedLogsTask.logs.map((log: string, i: number) => (
                <div key={i} className="flex gap-2">
                  <span className="text-cyan-600 select-none">&gt;</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  hudSound.playBlip();
                  setSelectedLogsTask(null);
                }}
                className="px-4 py-1.5 rounded bg-cyan-400 text-slate-950 font-mono font-bold text-xs hover:bg-cyan-300 transition-all shadow-[0_0_8px_#00f0ff]"
              >
                CLOSE TERMINAL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
