"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Play,
  ShieldAlert,
  Cpu,
  Lock,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

export default function DashboardPage() {
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [isEmergencyLocked, setIsEmergencyLocked] = useState(false);

  // Approvals State
  const [pendingApprovals, setPendingApprovals] = useState([
    {
      id: "appr-001",
      task_id: "task-002",
      action_type: "DEPLOY_PULL_REQUEST",
      payload_hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      summary: "Deploy Pull Request #42 into production organization.",
      expires_in: "24m",
    },
  ]);

  // Tasks State
  const [tasks, setTasks] = useState([
    {
      id: "task-001",
      title: "Initialize Repository & CI Architecture",
      status: "COMPLETED",
      priority: "HIGH",
      stepsCount: 5,
      completedSteps: 5,
    },
    {
      id: "task-002",
      title: "Deploy Pull Request with Test Badges",
      status: "AWAITING_APPROVAL",
      priority: "CRITICAL",
      stepsCount: 5,
      completedSteps: 3,
    },
  ]);

  const handleCreateTask = () => {
    if (!taskTitle.trim() || !taskDesc.trim()) return;
    const newTask = {
      id: `task-${Date.now().toString().slice(-3)}`,
      title: taskTitle,
      status: "PENDING",
      priority: priority,
      stepsCount: 5,
      completedSteps: 0,
    };
    setTasks([newTask, ...tasks]);
    setTaskTitle("");
    setTaskDesc("");
  };

  const handleApprovalDecision = (id: string, decision: "APPROVED" | "REJECTED") => {
    setPendingApprovals(pendingApprovals.filter((a) => a.id !== id));
    setTasks(
      tasks.map((t) =>
        t.status === "AWAITING_APPROVAL"
          ? { ...t, status: decision === "APPROVED" ? "COMPLETED" : "FAILED", completedSteps: decision === "APPROVED" ? 5 : 3 }
          : t
      )
    );
  };

  const handleEmergencyStop = () => {
    setIsEmergencyLocked(true);
    setTasks(
      tasks.map((t) =>
        t.status !== "COMPLETED" ? { ...t, status: "CANCELLED" } : t
      )
    );
    setPendingApprovals([]);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <p className="text-xs text-slate-400">Total Tasks</p>
          <p className="text-xl font-bold mt-1 text-slate-100">{tasks.length}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <p className="text-xs text-slate-400">Monthly Budget</p>
          <p className="text-xl font-bold mt-1 text-emerald-400">₹0 / ₹1,000</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <p className="text-xs text-slate-400">Active Approvals</p>
          <p className="text-xl font-bold mt-1 text-amber-400">{pendingApprovals.length}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <p className="text-xs text-slate-400">System State</p>
          <p
            className={`text-xl font-bold mt-1 flex items-center gap-1.5 ${
              isEmergencyLocked ? "text-rose-400" : "text-emerald-400"
            }`}
          >
            {isEmergencyLocked ? "LOCKED" : "OPERATIONAL"}
          </p>
        </div>
      </div>

      {/* Pending Approvals Banner (High Priority) */}
      {pendingApprovals.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-900/80 rounded-xl p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400 animate-bounce" />
            <h2 className="font-semibold text-amber-200">Human Approval Required</h2>
            <span className="text-xs bg-amber-900/60 text-amber-300 px-2 py-0.5 rounded-full font-mono">
              Action Gated
            </span>
          </div>
          {pendingApprovals.map((appr) => (
            <div
              key={appr.id}
              className="bg-slate-900/80 border border-amber-900/50 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-amber-400">{appr.action_type}</span>
                  <span className="text-xs text-slate-400 font-mono">Expires in {appr.expires_in}</span>
                </div>
                <p className="text-sm text-slate-200">{appr.summary}</p>
                <p className="text-xs text-slate-400 font-mono">
                  SHA-256: {appr.payload_hash.slice(0, 16)}...
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleApprovalDecision(appr.id, "APPROVED")}
                  className="flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold text-xs transition-colors"
                >
                  <ThumbsUp className="w-3.5 h-3.5" /> Approve
                </button>
                <button
                  onClick={() => handleApprovalDecision(appr.id, "REJECTED")}
                  className="flex items-center gap-1 px-3 py-1.5 rounded bg-rose-900/80 hover:bg-rose-800 text-rose-200 font-semibold text-xs transition-colors"
                >
                  <ThumbsDown className="w-3.5 h-3.5" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Grid: Task Intake & Active Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Task Submission Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-emerald-400" />
            <h2 className="font-semibold text-slate-200">Submit Coding Task</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400">Task Title</label>
              <input
                type="text"
                placeholder="e.g. Implement user profile endpoint"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                disabled={isEmergencyLocked}
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Description & Requirements</label>
              <textarea
                rows={4}
                placeholder="Describe bug or feature requirements clearly..."
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                disabled={isEmergencyLocked}
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={isEmergencyLocked}
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleCreateTask}
              disabled={isEmergencyLocked}
              className="w-full py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold text-sm transition-colors disabled:opacity-50"
            >
              Dispatch Task
            </button>
          </div>
        </div>

        {/* Right Column: Task Timeline & List */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-200">Autonomous Task Queue</h2>
            <span className="text-xs text-slate-400">Mobile-First Timeline</span>
          </div>

          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">{task.id}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded font-semibold border ${
                        task.status === "COMPLETED"
                          ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                          : task.status === "AWAITING_APPROVAL"
                          ? "bg-amber-950 text-amber-400 border-amber-800"
                          : task.status === "CANCELLED"
                          ? "bg-slate-800 text-slate-400 border-slate-700"
                          : "bg-cyan-950 text-cyan-400 border-cyan-800"
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                  <p className="font-medium text-slate-100 text-sm">{task.title}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Steps: {task.completedSteps}/{task.stepsCount} completed
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors">
                    View Logs
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Emergency Kill-Switch Bar */}
          <div className="bg-rose-950/40 border border-rose-900/60 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <div>
                <p className="text-xs font-semibold text-rose-200">Emergency Kill-Switch</p>
                <p className="text-xs text-rose-300/70">
                  Immediately halts active runners, cancels pending tasks, and revokes temporary tokens.
                </p>
              </div>
            </div>
            <button
              onClick={handleEmergencyStop}
              disabled={isEmergencyLocked}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded transition-colors disabled:opacity-50"
            >
              {isEmergencyLocked ? "SYSTEM LOCKED" : "KILL ALL"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
