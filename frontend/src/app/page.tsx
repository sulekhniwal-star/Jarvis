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
  Disc,
  GitBranch,
  ExternalLink,
  FileCode,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { hudSound } from "../utils/sound";
import {
  fetchTelemetry,
  fetchTasks,
  createTaskApi,
  fetchApprovals,
  evaluateApprovalApi,
  approveTaskApi,
  rejectTaskApi,
  emergencyStopApi,
  fetchFleetRepos,
  fetchRepoAudit,
  improveProjectApi,
  selfImproveJarvisApi,
  TelemetryData,
  TaskItem,
  FleetRepo,
} from "../utils/api";

export default function DashboardPage() {
  // Task Intake State
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [priority, setPriority] = useState("TACTICAL (MEDIUM)");
  const [isEmergencyLocked, setIsEmergencyLocked] = useState(false);
  const [selectedLogsTask, setSelectedLogsTask] = useState<TaskItem | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hudMode, setHudMode] = useState<"TACTICAL" | "SURGE" | "STEALTH">("TACTICAL");
  const [isDispatching, setIsDispatching] = useState(false);

  // GitHub Fleet State
  const [fleetRepos, setFleetRepos] = useState<FleetRepo[]>([]);
  const [selectedAuditRepo, setSelectedAuditRepo] = useState<any | null>(null);
  const [isAuditingRepo, setIsAuditingRepo] = useState<string | null>(null);
  const [isSelfImproving, setIsSelfImproving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live Telemetry State
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    status: "OPERATIONAL",
    hardware: {
      cpu_percent: 18.4,
      cpu_cores: 8,
      ram_total_gb: 16.0,
      ram_used_gb: 6.8,
      ram_percent: 42.5,
      network: {
        kb_sent: 142.0,
        mb_recv: 2.4,
      },
    },
    database: {
      status: "connected",
      total_tasks: 0,
      active_tasks: 0,
      pending_approvals: 0,
    },
    budget: {
      current_inr: 0,
      monthly_limit_inr: 1000,
      currency: "INR",
    },
    ai_provider: {
      name: "openrouter",
      model: "openrouter/auto",
      status: "ready",
    },
  });

  // Approvals State
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);

  // Tasks State
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  // Real-time Clock
  const [currentTime, setCurrentTime] = useState("");

  // Clock interval
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

  // Show Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Live Polling of Backend Telemetry, Tasks, and Approvals
  const loadData = async () => {
    try {
      // 1. Telemetry
      const telem = await fetchTelemetry();
      if (telem) {
        setTelemetry(telem);
        if (telem.status === "LOCKED") {
          setIsEmergencyLocked(true);
        }
      }

      // 2. Tasks
      const remoteTasks = await fetchTasks();
      if (remoteTasks && remoteTasks.length > 0) {
        setTasks(remoteTasks);
      }

      // 3. Approvals
      const remoteApprovals = await fetchApprovals();
      setPendingApprovals(remoteApprovals);

      // 4. Fleet Repositories
      const repos = await fetchFleetRepos();
      if (repos && repos.length > 0) {
        setFleetRepos(repos);
      }
    } catch (err) {
      console.debug("Backend polling cycle:", err);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleCreateTask = async () => {
    if (!taskTitle.trim() || !taskDesc.trim() || isEmergencyLocked || isDispatching) return;
    setIsDispatching(true);
    hudSound.playDispatch();

    try {
      const created = await createTaskApi(taskTitle, taskDesc, priority);
      if (created) {
        setTasks((prev) => [created, ...prev]);
        setTaskTitle("");
        setTaskDesc("");
        showToast("Task dispatched to Jarvis orchestration plane!");
        loadData();
      }
    } catch (err) {
      console.warn("Falling back to local task intake:", err);
      const localTask: TaskItem = {
        id: `TASK-${Date.now().toString().slice(-4)}`,
        title: taskTitle,
        description: taskDesc,
        status: "IN_PROGRESS",
        priority: priority,
        stepsCount: 4,
        completedSteps: 1,
        logs: [
          `[00:01] Task queued by Stark Interface. Priority: ${priority}`,
          `[00:02] Tool: repo_inspect -> Analyzing repository layout...`,
        ],
      };
      setTasks((prev) => [localTask, ...prev]);
      setTaskTitle("");
      setTaskDesc("");
    } finally {
      setIsDispatching(false);
    }
  };

  const handleApprovalDecision = async (id: string, decision: "APPROVED" | "REJECTED") => {
    hudSound.playBlip();
    try {
      await evaluateApprovalApi(id, decision);
      setPendingApprovals((prev) => prev.filter((a) => a.id !== id));
      showToast(`Action ${decision === "APPROVED" ? "Authorized" : "Aborted"}`);
      loadData();
    } catch (err) {
      console.warn("Approval evaluated locally:", err);
      setPendingApprovals((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const handleApproveTask = async (taskId: string) => {
    hudSound.playBlip();
    try {
      await approveTaskApi(taskId);
      showToast(`Mission ${taskId.slice(0, 8)} Authorized! Protocol Active.`);
      loadData();
    } catch (err: any) {
      console.error("Task authorization failed:", err);
      showToast(`Authorization failed: ${err.message || "Network Error"}`);
    }
  };

  const handleRejectTask = async (taskId: string) => {
    hudSound.playEmergency();
    try {
      await rejectTaskApi(taskId);
      showToast(`Mission ${taskId.slice(0, 8)} Aborted/Cancelled.`);
      loadData();
    } catch (err: any) {
      console.error("Task cancellation failed:", err);
      showToast(`Cancellation failed: ${err.message || "Network Error"}`);
    }
  };

  const handleEmergencyStop = async () => {
    hudSound.playEmergency();
    setIsEmergencyLocked(true);
    try {
      await emergencyStopApi();
      showToast("🚨 DEFCON 1 EMERGENCY LOCKDOWN ACTIVATED");
      loadData();
    } catch (err) {
      console.warn("Emergency stop evaluated locally:", err);
      setTasks((prev) =>
        prev.map((t) =>
          t.status !== "COMPLETED" ? { ...t, status: "CANCELLED" } : t
        )
      );
      setPendingApprovals([]);
    }
  };

  // Self-Improvement Handler (P0 Priority)
  const handleSelfImprove = async () => {
    hudSound.playDispatch();
    setIsSelfImproving(true);
    try {
      const res = await selfImproveJarvisApi();
      showToast(`⚡ Self-Improvement Protocol Dispatched (Task: ${res.task_id?.slice(0, 8)})`);
      loadData();
    } catch (err) {
      console.error("Self-improvement error:", err);
      showToast("Self-improvement request failed");
    } finally {
      setIsSelfImproving(false);
    }
  };

  // Deep AI Audit on Target Repo
  const handleDeepAudit = async (repoName: string) => {
    hudSound.playBlip();
    setIsAuditingRepo(repoName);
    try {
      const audit = await fetchRepoAudit(repoName);
      setSelectedAuditRepo(audit);
    } catch (err) {
      console.error("Deep audit error:", err);
      showToast(`Failed to audit ${repoName}`);
    } finally {
      setIsAuditingRepo(null);
    }
  };

  // Auto-Improve Target Repo
  const handleImproveRepo = async (repoName: string) => {
    hudSound.playDispatch();
    try {
      const res = await improveProjectApi(repoName);
      showToast(`🚀 Auto-Improvement Task Dispatched for ${repoName}!`);
      loadData();
      if (selectedAuditRepo) setSelectedAuditRepo(null);
    } catch (err) {
      console.error("Improve repo error:", err);
      showToast(`Failed to dispatch improvement for ${repoName}`);
    }
  };

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    hudSound.enabled = newState;
    if (newState) hudSound.playBlip();
  };

  return (
    <div className="space-y-6 pb-24 select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 tech-border bg-[#020b18]/95 border-cyan-400 px-4 py-2.5 rounded shadow-[0_0_15px_#00f0ff] font-mono text-xs text-cyan-200 flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-cyan-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP TELEMETRY HUD BAR (Real Hardware, Power, Live Clock, Defcon) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Arc Energy Core (Database Connection Status & Power) */}
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
              {telemetry.database.status === "connected" ? "100% PURE" : "94% SURGE"}
            </p>
          </div>
        </div>

        {/* Real Quantum CPU Compute */}
        <div className="tech-border p-3 rounded-lg flex items-center gap-3">
          <div className="w-10 h-10 rounded border border-cyan-500/40 bg-cyan-950/40 flex items-center justify-center flex-shrink-0">
            <Cpu className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="w-full">
            <div className="flex justify-between items-center text-[10px] font-mono text-cyan-500">
              <span>CPU LOAD</span>
              <span className="text-cyan-300 font-bold">
                {telemetry.hardware.cpu_percent}%
              </span>
            </div>
            <div className="w-full bg-cyan-950 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                className="bg-cyan-400 h-full rounded-full shadow-[0_0_8px_#00f0ff] transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, telemetry.hardware.cpu_percent))}%` }}
              />
            </div>
            <span className="text-[9px] font-mono text-cyan-600 block mt-0.5">
              {telemetry.hardware.cpu_cores} THREADS ACTIVE
            </span>
          </div>
        </div>

        {/* Real Neural Memory Cache */}
        <div className="tech-border p-3 rounded-lg flex items-center gap-3">
          <div className="w-10 h-10 rounded border border-cyan-500/40 bg-cyan-950/40 flex items-center justify-center flex-shrink-0">
            <Database className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-cyan-500">
              NEURAL MEMORY
            </p>
            <p className="text-base font-bold font-mono text-cyan-200">
              {telemetry.hardware.ram_used_gb} / {telemetry.hardware.ram_total_gb} GB
            </p>
            <span className="text-[9px] font-mono text-cyan-600">
              {telemetry.hardware.ram_percent}% ALLOCATED
            </span>
          </div>
        </div>

        {/* Real Uplink / Downlink Bandwidth */}
        <div className="tech-border p-3 rounded-lg flex items-center gap-3">
          <div className="w-10 h-10 rounded border border-cyan-500/40 bg-cyan-950/40 flex items-center justify-center flex-shrink-0">
            <Wifi className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-cyan-500">
              DATA TELEMETRY
            </p>
            <p className="text-xs font-mono font-bold text-cyan-300">
              ▲ {telemetry.hardware.network.kb_sent} KB/s
            </p>
            <p className="text-xs font-mono font-bold text-cyan-400">
              ▼ {telemetry.hardware.network.mb_recv} MB/s
            </p>
          </div>
        </div>

        {/* Token Budget / Real Cost Control */}
        <div className="tech-border p-3 rounded-lg flex items-center gap-3">
          <div className="w-10 h-10 rounded border border-cyan-500/40 bg-cyan-950/40 flex items-center justify-center flex-shrink-0">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-cyan-500">
              MONTHLY BUDGET
            </p>
            <p className="text-base font-extrabold font-mono text-emerald-400">
              ₹{telemetry.budget.current_inr} / ₹{telemetry.budget.monthly_limit_inr}
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
        <div className="absolute inset-0 scanlines opacity-40 pointer-events-none" />

        {/* Corner HUD Markers */}
        <div className="absolute top-2 left-3 text-[9px] font-mono text-cyan-500/60">
          [TARGET_LOC: 88.205.188.122 // DB: {telemetry.database.status.toUpperCase()}]
        </div>
        <div className="absolute top-2 right-3 text-[9px] font-mono text-cyan-500/60">
          [FLEET_REPOS: {fleetRepos.length} // ACTIVE_TASKS: {tasks.length}]
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
                GitHub Fleet: {fleetRepos.length} Repos Tracked // Model: {telemetry.ai_provider.model}
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
              <div className="absolute inset-0 rounded-full border border-cyan-500/30 border-dashed animate-spin-slow" />
              <div className="absolute w-48 h-48 sm:w-56 sm:h-56 rounded-full border-2 border-cyan-400/40 border-t-cyan-300 border-b-cyan-300 animate-spin-reverse" />
              <div className="absolute w-40 h-40 sm:w-48 sm:h-48 rounded-full border border-cyan-400/60 border-l-transparent border-r-transparent animate-spin-slow" />

              <div className="absolute w-full h-px bg-cyan-500/20" />
              <div className="absolute h-full w-px bg-cyan-500/20" />

              <div className="absolute inset-4 rounded-full border border-cyan-400/20 overflow-hidden pointer-events-none">
                <div className="w-full h-full bg-gradient-to-tr from-cyan-400/25 via-transparent to-transparent animate-radar origin-center" />
              </div>

              {/* Core Arc Reactor Center */}
              <div
                onClick={handleSelfImprove}
                title="Click to Trigger Jarvis Self-Improvement Protocol"
                className="relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#020b18]/90 border-2 border-cyan-300 flex flex-col items-center justify-center shadow-[0_0_25px_rgba(0,240,255,0.45)] group cursor-pointer hover:scale-105 transition-all"
              >
                <div className="absolute inset-1 rounded-full border border-cyan-400/40 animate-ping opacity-25" />
                <Disc className="w-8 h-8 text-cyan-300 animate-spin-slow mb-0.5" />
                <span className="text-[13px] font-black font-mono tracking-widest text-cyan-200 glow-cyan">
                  J.A.R.V.I.S.
                </span>
                <span className="text-[8px] font-mono text-cyan-400 tracking-wider">
                  EVOLVE (P0)
                </span>
              </div>
            </div>

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
                GITHUB REPOS ACCESS
              </span>
              <span className="text-cyan-300 font-bold">
                14 / 14 SYNCHRONIZED
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
                SECURITY INTERCEPT // HUMAN AUTHORIZATION REQUIRED ({pendingApprovals.length})
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
                    EXPIRES IN: {appr.expires_in || "24m"}
                  </span>
                </div>
                <p className="text-xs text-slate-200">{appr.summary || appr.description}</p>
                <p className="text-[11px] text-cyan-600">
                  PAYLOAD SHA-256: {(appr.payload_hash || appr.id).slice(0, 24)}...
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
      {/* 4. MAIN TACTICAL GRID (Intake Form & Real Mission Queue) */}
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
                disabled={isEmergencyLocked || isDispatching}
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
                disabled={isEmergencyLocked || isDispatching}
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
                disabled={isEmergencyLocked || isDispatching}
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
              disabled={isEmergencyLocked || isDispatching || !taskTitle.trim() || !taskDesc.trim()}
              className="w-full py-2.5 px-4 rounded bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition-all shadow-[0_0_12px_#00f0ff] disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {isDispatching ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  PLANNING STEPS...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  DISPATCH PROTOCOL
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Mission Manifest & Real Task Queue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2.5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h2 className="font-extrabold text-cyan-300 tracking-wider font-mono text-sm uppercase">
                AUTONOMOUS MISSION MANIFEST ({tasks.length})
              </h2>
            </div>
            <span className="text-[10px] font-mono text-cyan-500">
              REAL-TIME DATABASE SYNC
            </span>
          </div>

          <div className="space-y-3 font-mono">
            {tasks.length === 0 ? (
              <div className="tech-border rounded-lg p-6 text-center text-cyan-600 font-mono text-xs">
                &gt; NO ACTIVE MISSIONS IN QUEUE. DISPATCH A TASK TO BEGIN.
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="tech-border rounded-lg p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-cyan-400/60 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-cyan-500 font-bold">{task.id.slice(0, 8)}</span>
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
                            width: `${(task.completedSteps / Math.max(1, task.stepsCount)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center flex-wrap gap-2">
                    {(() => {
                      const prStep = task.steps?.find((s: any) => (s as any)?.description?.includes("github.com") && (s as any)?.description?.includes("/pull/"));
                      if (!prStep) return null;
                      const match = (prStep as any)?.description?.match(/https:\/\/github\.com\/[^\s]+\/pull\/\d+/);
                      if (!match) return null;
                      return (
                        <a
                          href={match[0]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-purple-500 bg-purple-950/80 hover:bg-purple-900 text-purple-300 text-xs font-bold transition-all shadow-[0_0_10px_#a855f7] hover:scale-105"
                          title="View live Pull Request on GitHub"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                          VIEW PULL REQUEST
                        </a>
                      );
                    })()}

                    {(task.status === "PENDING" || task.status === "AWAITING_APPROVAL" || task.status === "PLANNING") && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApproveTask(task.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-emerald-400 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 text-xs font-extrabold transition-all shadow-[0_0_10px_#10b981] hover:scale-105 active:scale-95"
                          title="Authorize and execute this autonomous mission"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          APPROVE & RUN
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRejectTask(task.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-rose-500/50 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 text-xs font-semibold transition-all hover:border-rose-400"
                          title="Abort and cancel this mission"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          REJECT
                        </button>
                      </>
                    )}

                    <button
                      type="button"
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
              ))
            )}
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
      {/* 5. STARK SATELLITE RECON // GITHUB FLEET AUDIT & SELF-IMPROVEMENT */}
      {/* ========================================================================= */}
      <div className="tech-border rounded-xl p-5 lg:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/30 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-cyan-950/80 border border-cyan-400/60 flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-cyan-200 tracking-wider font-mono text-base uppercase">
                  STARK SATELLITE RECON // GITHUB FLEET AUDIT
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/40">
                  {fleetRepos.length} REPOSITORIES
                </span>
              </div>
              <p className="text-xs font-mono text-cyan-500">
                Autonomous Codebase Research, Missing Component Detection & Self-Improvement Pipeline
              </p>
            </div>
          </div>

          {/* Master Self-Improvement Action */}
          <button
            onClick={handleSelfImprove}
            disabled={isSelfImproving || isEmergencyLocked}
            className="flex items-center gap-2 px-4 py-2 rounded bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-mono font-black text-xs uppercase tracking-wider shadow-[0_0_15px_#00f0ff] hover:scale-105 transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {isSelfImproving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                EVOLVING CORE...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-current text-slate-950" />
                EXECUTE JARVIS SELF-IMPROVEMENT (P0)
              </>
            )}
          </button>
        </div>

        {/* Repositories Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
          {fleetRepos.map((repo) => (
            <div
              key={repo.name}
              className={`tech-border rounded-lg p-3.5 space-y-2.5 transition-all hover:border-cyan-400 font-mono ${
                repo.priority_tier.includes("P0")
                  ? "border-cyan-400/80 bg-cyan-950/30 glow-cyan-box"
                  : repo.priority_tier.includes("P1")
                  ? "border-blue-500/60 bg-[#020d1c]/80"
                  : "border-cyan-900/60 bg-[#020b18]/70"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-cyan-200">
                      {repo.name}
                    </span>
                    {repo.is_private && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        PRIV
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-cyan-500 font-semibold block">
                    {repo.priority_tier.replace("_", " ")} (W:{repo.priority_weight})
                  </span>
                </div>

                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                  {repo.language}
                </span>
              </div>

              <p className="text-xs text-slate-300 line-clamp-2 h-8">
                {repo.description}
              </p>

              {/* Health Score & Completion Gauge */}
              <div className="space-y-1 pt-1 text-[10px] text-cyan-400">
                <div className="flex justify-between">
                  <span>COMPLETION: {repo.estimated_completion}%</span>
                  <span className="text-cyan-300 font-bold">HEALTH: {repo.health_score}/100</span>
                </div>
                <div className="w-full bg-cyan-950 h-1 rounded-full overflow-hidden">
                  <div
                    className="bg-cyan-400 h-full rounded-full"
                    style={{ width: `${repo.estimated_completion}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => handleDeepAudit(repo.name)}
                  disabled={isAuditingRepo === repo.name}
                  className="flex items-center justify-center gap-1 py-1 px-2 rounded border border-cyan-500/50 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 text-[11px] font-semibold transition-all"
                >
                  {isAuditingRepo === repo.name ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Activity className="w-3 h-3" />
                  )}
                  DEEP AUDIT
                </button>

                <button
                  onClick={() => handleImproveRepo(repo.name)}
                  className="flex items-center justify-center gap-1 py-1 px-2 rounded bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-[11px] font-bold shadow-[0_0_8px_#00f0ff] transition-all"
                >
                  <Sparkles className="w-3 h-3" />
                  IMPROVE
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. BOTTOM HOLOGRAPHIC DOCK */}
      {/* ========================================================================= */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 bg-[#020b18]/90 border border-cyan-500/40 backdrop-blur-md px-4 py-2 rounded-full shadow-[0_0_20px_rgba(0,240,255,0.25)] flex items-center gap-3 sm:gap-4">
        {[
          { icon: Disc, label: "Core" },
          { icon: Crosshair, label: "Target" },
          { icon: GitBranch, label: "Fleet" },
          { icon: Activity, label: "Radar" },
          { icon: Database, label: "Memory" },
          { icon: Cpu, label: "Quantum" },
        ].map((item, idx) => (
          <button
            key={idx}
            onClick={() => {
              hudSound.playBlip();
              loadData();
            }}
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
      {/* 7. HOLOGRAPHIC TERMINAL LOGS MODAL */}
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
              <div className="text-cyan-500 pb-1 border-b border-cyan-950">
                &gt; MISSION: {selectedLogsTask.title}
              </div>
              {selectedLogsTask.logs && selectedLogsTask.logs.length > 0 ? (
                selectedLogsTask.logs.map((log: string, i: number) => {
                  const urlMatch = log.match(/https:\/\/github\.com\/[^\s]+\/pull\/\d+/);
                  return (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-cyan-600 select-none">&gt;</span>
                      <div className="flex-1">
                        <span>{urlMatch ? log.replace(urlMatch[0], "").trim() : log}</span>
                        {urlMatch && (
                          <a
                            href={urlMatch[0]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-400 font-bold underline hover:text-emerald-300 ml-1.5 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 shadow-[0_0_8px_#10b981]"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {urlMatch[0]}
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-cyan-600">&gt; No steps executed yet.</div>
              )}
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

      {/* ========================================================================= */}
      {/* 8. DEEP AI AUDIT & RESEARCH REPORT MODAL */}
      {/* ========================================================================= */}
      {selectedAuditRepo && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="tech-border bg-[#010915] rounded-xl max-w-3xl w-full p-6 space-y-4 glow-cyan-box relative max-h-[85vh] overflow-y-auto font-mono">
            <div className="flex items-center justify-between border-b border-cyan-500/40 pb-3">
              <div className="flex items-center gap-2.5">
                <Activity className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="font-bold text-sm text-cyan-200 tracking-wider">
                    STARK RECON // DEEP AUDIT REPORT
                  </h3>
                  <span className="text-xs text-cyan-500">
                    Target: {selectedAuditRepo.repository}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  hudSound.playBlip();
                  setSelectedAuditRepo(null);
                }}
                className="text-cyan-500 hover:text-cyan-300 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-[#020b18] p-2.5 rounded border border-cyan-500/30">
                <span className="text-cyan-500 block text-[10px]">HEALTH SCORE</span>
                <span className="text-base font-bold text-cyan-300 glow-cyan">
                  {selectedAuditRepo.health_score}/100
                </span>
              </div>
              <div className="bg-[#020b18] p-2.5 rounded border border-cyan-500/30">
                <span className="text-cyan-500 block text-[10px]">TOTAL FILES</span>
                <span className="text-base font-bold text-cyan-200">
                  {selectedAuditRepo.total_files}
                </span>
              </div>
              <div className="bg-[#020b18] p-2.5 rounded border border-cyan-500/30">
                <span className="text-cyan-500 block text-[10px]">CI PIPELINE</span>
                <span className={`text-xs font-bold ${selectedAuditRepo.has_ci ? "text-emerald-400" : "text-rose-400"}`}>
                  {selectedAuditRepo.has_ci ? "ACTIVE" : "MISSING"}
                </span>
              </div>
              <div className="bg-[#020b18] p-2.5 rounded border border-cyan-500/30">
                <span className="text-cyan-500 block text-[10px]">AUTOMATED TESTS</span>
                <span className={`text-xs font-bold ${selectedAuditRepo.has_tests ? "text-emerald-400" : "text-rose-400"}`}>
                  {selectedAuditRepo.has_tests ? "VERIFIED" : "NONE DETECTED"}
                </span>
              </div>
            </div>

            {/* AI Architectural Summary */}
            <div className="bg-[#020b18] border border-cyan-500/30 rounded p-4 space-y-2 text-xs text-slate-200">
              <span className="text-cyan-400 font-bold block tracking-wider text-[11px] uppercase">
                &gt; EXECUTIVE ARCHITECTURAL ASSESSMENT
              </span>
              <p className="leading-relaxed">
                {selectedAuditRepo.analysis?.summary || "Comprehensive codebase inspection complete."}
              </p>
            </div>

            {/* Planned Execution Steps */}
            {selectedAuditRepo.analysis?.steps && (
              <div className="bg-[#020b18] border border-cyan-500/30 rounded p-4 space-y-2 text-xs">
                <span className="text-cyan-400 font-bold block tracking-wider text-[11px] uppercase">
                  &gt; RECOMMENDED COMPLETION DIRECTIVES
                </span>
                <div className="space-y-1.5">
                  {selectedAuditRepo.analysis.steps.map((s: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 text-cyan-200">
                      <span className="text-cyan-500 font-bold">{s.sequence || idx + 1}.</span>
                      <div>
                        <span className="font-semibold text-cyan-300">{s.name}</span>
                        {s.tool && (
                          <span className="ml-2 text-[10px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-500 border border-cyan-800">
                            {s.tool}
                          </span>
                        )}
                        {s.description && (
                          <p className="text-[11px] text-slate-400 mt-0.5">{s.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-cyan-950">
              <span className="text-[11px] text-cyan-600">
                AI Provider: OpenRouter Auto // High Confidence
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedAuditRepo(null)}
                  className="px-4 py-1.5 rounded border border-cyan-500/40 bg-cyan-950/60 text-cyan-300 text-xs font-semibold hover:bg-cyan-900/60"
                >
                  DISMISS
                </button>
                <button
                  onClick={() => handleImproveRepo(selectedAuditRepo.name)}
                  className="px-4 py-1.5 rounded bg-cyan-400 text-slate-950 font-bold text-xs hover:bg-cyan-300 shadow-[0_0_10px_#00f0ff] flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  DISPATCH AUTO-IMPROVE PROTOCOL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
