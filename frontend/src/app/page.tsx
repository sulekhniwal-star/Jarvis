"use client";

import React, { useState, useEffect } from "react";
import { ShieldAlert, Play, Lock } from "lucide-react";
import { hudSound } from "../utils/sound";
import {
  fetchTelemetry,
  fetchTasks,
  createTaskApi,
  fetchApprovals,
  evaluateApprovalApi,
  approveTaskApi,
  rejectTaskApi,
  retryTaskApi,
  fetchTaskDiff,
  emergencyStopApi,
  resumeSystemApi,
  fetchFleetRepos,
  fetchRepoAudit,
  improveProjectApi,
  selfImproveJarvisApi,
  batchUpgradeDependenciesApi,
  TelemetryData,
  TaskItem,
  FleetRepo,
} from "../utils/api";

import { TelemetryHUD } from "../components/hud/TelemetryHUD";
import { TaskIntakeForm } from "../components/hud/TaskIntakeForm";
import { PendingApprovalsModal } from "../components/hud/PendingApprovalsModal";
import { MissionManifest } from "../components/hud/MissionManifest";
import { FleetAuditor } from "../components/hud/FleetAuditor";
import { LogViewerModal } from "../components/hud/LogViewerModal";
import { DiffViewerModal } from "../components/hud/DiffViewerModal";

export default function DashboardPage() {
  // Task Intake State
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [priority, setPriority] = useState("TACTICAL (MEDIUM)");
  const [isEmergencyLocked, setIsEmergencyLocked] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hudMode, setHudMode] = useState<"TACTICAL" | "SURGE" | "STEALTH">("TACTICAL");
  const [isDispatching, setIsDispatching] = useState(false);
  const [isBatchUpgrading, setIsBatchUpgrading] = useState(false);

  // Modals & Inspection State
  const [selectedLogsTask, setSelectedLogsTask] = useState<TaskItem | null>(null);
  const [selectedDiffTask, setSelectedDiffTask] = useState<{
    title: string;
    diffText: string;
  } | null>(null);

  // GitHub Fleet State
  const [fleetRepos, setFleetRepos] = useState<FleetRepo[]>([]);
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

  // Approvals & Tasks State
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
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

  // Load Fleet Repositories
  const loadFleet = async () => {
    try {
      const repos = await fetchFleetRepos();
      if (repos && repos.length > 0) {
        setFleetRepos(repos);
      }
    } catch (err) {
      console.debug("Fleet discovery cycle:", err);
    }
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
        } else if (telem.status === "OPERATIONAL") {
          setIsEmergencyLocked(false);
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
    } catch (err) {
      console.debug("Backend polling cycle:", err);
    }
  };

  useEffect(() => {
    loadFleet();
    const fleetTimer = setInterval(loadFleet, 60000);
    return () => clearInterval(fleetTimer);
  }, []);

  useEffect(() => {
    loadData();
    const pollInterval = hudMode === "SURGE" ? 2000 : hudMode === "STEALTH" ? 10000 : 4000;
    const timer = setInterval(loadData, pollInterval);
    return () => clearInterval(timer);
  }, [hudMode]);

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
        status: "PLANNING",
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

  const handleRetryTask = async (taskId: string) => {
    hudSound.playBlip();
    try {
      await retryTaskApi(taskId);
      showToast(`Mission ${taskId.slice(0, 8)} Retry Initiated!`);
      loadData();
    } catch (err: any) {
      console.error("Task retry failed:", err);
      showToast(`Retry failed: ${err.message || "Network Error"}`);
    }
  };

  const handleViewDiff = async (task: TaskItem) => {
    hudSound.playBlip();
    try {
      const res = await fetchTaskDiff(task.id);
      setSelectedDiffTask({
        title: task.title,
        diffText: res.diff || "No diff generated.",
      });
    } catch (err: any) {
      console.error("Failed to fetch diff:", err);
      setSelectedDiffTask({
        title: task.title,
        diffText: `diff --git a/${task.id}.py b/${task.id}.py\n+# Live patch placeholder\n+# Status: ${task.status}`,
      });
    }
  };

  const handleEmergencyStop = async () => {
    hudSound.playEmergency();
    setIsEmergencyLocked(true);
    try {
      await emergencyStopApi();
      showToast("DEFCON 1 EMERGENCY LOCKDOWN ACTIVATED");
      loadData();
    } catch (err) {
      console.warn("Emergency stop evaluated locally:", err);
    }
  };

  const handleResumeSystem = async () => {
    hudSound.playBlip();
    setIsEmergencyLocked(false);
    try {
      await resumeSystemApi();
      showToast("SYSTEM RESTORED TO OPERATIONAL STATUS");
      loadData();
    } catch (err) {
      console.warn("System resume evaluated locally:", err);
    }
  };

  const handleAuditRepo = async (repoName: string) => {
    setIsAuditingRepo(repoName);
    hudSound.playBlip();
    try {
      const report = await fetchRepoAudit(repoName);
      showToast(`Deep audit completed for ${repoName}: Health ${report.health_score}/100`);
    } catch (err: any) {
      showToast(`Audit failed for ${repoName}: ${err.message || "Network error"}`);
    } finally {
      setIsAuditingRepo(null);
    }
  };

  const handleImproveProject = async (repoName: string) => {
    hudSound.playDispatch();
    try {
      const res = await improveProjectApi(repoName);
      showToast(`Auto-improvement task dispatched for ${repoName}`);
      loadData();
    } catch (err: any) {
      showToast(`Failed to dispatch improvement: ${err.message || "Network error"}`);
    }
  };

  const handleSelfImproveJarvis = async () => {
    setIsSelfImproving(true);
    hudSound.playDispatch();
    try {
      const res = await selfImproveJarvisApi();
      showToast(`Jarvis Self-Improvement Task Dispatched! (Health: ${res.health_score}/100)`);
      loadData();
    } catch (err: any) {
      showToast(`Self-improvement dispatch error: ${err.message || "Network error"}`);
    } finally {
      setIsSelfImproving(false);
    }
  };

  const handleBatchUpgrade = async () => {
    setIsBatchUpgrading(true);
    hudSound.playDispatch();
    try {
      const res = await batchUpgradeDependenciesApi();
      showToast(`Batch Dependency Upgrade Dispatched for ${res.total_dispatched} repos!`);
      loadData();
    } catch (err: any) {
      showToast(`Batch upgrade error: ${err.message || "Network error"}`);
    } finally {
      setIsBatchUpgrading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#02060d] text-gray-200 p-4 md:p-6 font-sans relative overflow-x-hidden selection:bg-cyan-500 selection:text-black">
      {/* Background Cyber Grid */}
      <div className="fixed inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#00e5ff10_1px,transparent_1px),linear-gradient(to_bottom,#00e5ff10_1px,transparent_1px)] bg-[size:40px_40px]" />

      {/* Main Flight Deck Container */}
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Telemetry Bar */}
        <TelemetryHUD
          telemetry={telemetry}
          currentTime={currentTime}
          isEmergencyLocked={isEmergencyLocked}
          hudMode={hudMode}
          setHudMode={setHudMode}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
        />

        {/* Pending Approvals */}
        <PendingApprovalsModal
          pendingApprovals={pendingApprovals}
          onDecision={handleApprovalDecision}
        />

        {/* Mission Dispatch Intake */}
        <TaskIntakeForm
          taskTitle={taskTitle}
          setTaskTitle={setTaskTitle}
          taskDesc={taskDesc}
          setTaskDesc={setTaskDesc}
          priority={priority}
          setPriority={setPriority}
          isEmergencyLocked={isEmergencyLocked}
          isDispatching={isDispatching}
          handleCreateTask={handleCreateTask}
        />

        {/* Active Mission Manifest */}
        <MissionManifest
          tasks={tasks}
          handleApproveTask={handleApproveTask}
          handleRejectTask={handleRejectTask}
          handleRetryTask={handleRetryTask}
          onInspectLogs={(task) => {
            hudSound.playBlip();
            setSelectedLogsTask(task);
          }}
          onViewDiff={handleViewDiff}
        />

        {/* GitHub Fleet Portfolio */}
        <FleetAuditor
          fleetRepos={fleetRepos}
          isAuditingRepo={isAuditingRepo}
          isSelfImproving={isSelfImproving}
          isBatchUpgrading={isBatchUpgrading}
          onAuditRepo={handleAuditRepo}
          onImproveProject={handleImproveProject}
          onSelfImproveJarvis={handleSelfImproveJarvis}
          onBatchUpgrade={handleBatchUpgrade}
        />

        {/* Emergency Kill-Switch Bar */}
        <div className="border border-rose-500/60 bg-rose-950/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-rose-500 animate-pulse" />
            <div>
              <h3 className="text-sm font-bold text-rose-300 uppercase font-mono tracking-wider">
                DEFCON 1 Emergency Lockdown Protocol
              </h3>
              <p className="text-xs text-rose-400/80 font-mono">
                Immediately aborts all running workers, revokes ephemeral tokens, and freezes state.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEmergencyLocked ? (
              <button
                type="button"
                onClick={handleResumeSystem}
                className="flex items-center gap-2 px-5 py-2.5 rounded font-mono text-xs font-bold tracking-wider uppercase bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_#10b981] transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                RESUME OPERATIONS
              </button>
            ) : (
              <button
                type="button"
                onClick={handleEmergencyStop}
                className="flex items-center gap-2 px-5 py-2.5 rounded font-mono text-xs font-bold tracking-wider uppercase bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_#f43f5e] transition-all hover:scale-102 active:scale-98"
              >
                <Lock className="w-3.5 h-3.5" />
                EMERGENCY STOP
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Floating Modals */}
      {selectedLogsTask && (
        <LogViewerModal
          task={selectedLogsTask}
          onClose={() => setSelectedLogsTask(null)}
        />
      )}

      {selectedDiffTask && (
        <DiffViewerModal
          taskTitle={selectedDiffTask.title}
          diffText={selectedDiffTask.diffText}
          onClose={() => setSelectedDiffTask(null)}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 border border-cyan-400 bg-cyan-950/90 text-cyan-200 px-4 py-2.5 rounded-lg font-mono text-xs shadow-[0_0_20px_#00e5ff] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
