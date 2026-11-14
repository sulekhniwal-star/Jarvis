"use client";

import React from "react";
import {
  Activity,
  Cpu,
  Database,
  Radio,
  Wifi,
  Volume2,
  VolumeX,
  Zap,
  Lock,
} from "lucide-react";
import { TelemetryData } from "../../utils/api";

interface TelemetryHUDProps {
  telemetry: TelemetryData;
  currentTime: string;
  isEmergencyLocked: boolean;
  hudMode: "TACTICAL" | "SURGE" | "STEALTH";
  setHudMode: (mode: "TACTICAL" | "SURGE" | "STEALTH") => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

export function TelemetryHUD({
  telemetry,
  currentTime,
  isEmergencyLocked,
  hudMode,
  setHudMode,
  soundEnabled,
  setSoundEnabled,
}: TelemetryHUDProps) {
  const isBudgetGated = telemetry.budget.current_inr >= telemetry.budget.monthly_limit_inr;

  return (
    <div className="space-y-4">
      {/* Top Header Bar */}
      <header className="border-b border-cyan-500/30 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Radio className="w-8 h-8 text-cyan-400 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isEmergencyLocked ? "bg-rose-400" : "bg-cyan-400"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  isEmergencyLocked ? "bg-rose-500" : "bg-cyan-500"
                }`}
              />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black tracking-widest text-cyan-300 drop-shadow-[0_0_10px_#00e5ff]">
                PROJECT JARVIS
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-cyan-400/40 bg-cyan-950/60 text-cyan-300 font-bold">
                STARK HUD v1.0.1
              </span>
            </div>
            <p className="text-xs text-cyan-500 font-mono tracking-wider">
              AUTONOMOUS SDLC FLIGHT DECK // PRIMARY AI: OPENROUTER AUTO
            </p>
          </div>
        </div>

        {/* Global Controls & Status */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          {/* UTC Clock */}
          <div className="border border-cyan-500/40 bg-cyan-950/40 px-3 py-1.5 rounded flex items-center gap-2 text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>UTC {currentTime || "00:00:00"}</span>
          </div>

          {/* Operational Mode Toggle */}
          <div className="border border-cyan-500/30 bg-black/40 rounded p-0.5 flex gap-1">
            {(["TACTICAL", "SURGE", "STEALTH"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setHudMode(mode)}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                  hudMode === mode
                    ? "bg-cyan-500 text-black shadow-[0_0_8px_#00e5ff]"
                    : "text-cyan-400 hover:text-white"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="border border-cyan-500/40 bg-cyan-950/40 p-1.5 rounded text-cyan-400 hover:text-white transition-colors"
            title={soundEnabled ? "Mute HUD Audio" : "Enable HUD Audio"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
          </button>

          {/* Status Indicator */}
          <div
            className={`border px-3 py-1.5 rounded flex items-center gap-2 font-bold ${
              isEmergencyLocked
                ? "border-rose-500/80 bg-rose-950/60 text-rose-300 animate-pulse"
                : "border-emerald-500/60 bg-emerald-950/40 text-emerald-300"
            }`}
          >
            {isEmergencyLocked ? <Lock className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
            <span>{isEmergencyLocked ? "DEFCON 1 LOCKDOWN" : "SYSTEM OPERATIONAL"}</span>
          </div>
        </div>
      </header>

      {/* Telemetry Metric Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Metric 1: CPU */}
        <div className="border border-cyan-500/30 bg-black/40 p-3 rounded-lg backdrop-blur-sm relative overflow-hidden group hover:border-cyan-400 transition-colors">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-mono tracking-wider">CPU LOAD</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-black font-mono text-cyan-300">
            {telemetry.hardware.cpu_percent}%
          </div>
          <div className="text-[10px] text-gray-500 font-mono mt-1">
            {telemetry.hardware.cpu_cores} Logical Cores
          </div>
          <div className="w-full bg-cyan-950 h-1 mt-2 rounded overflow-hidden">
            <div
              className="bg-cyan-400 h-full transition-all duration-500"
              style={{ width: `${Math.min(100, telemetry.hardware.cpu_percent)}%` }}
            />
          </div>
        </div>

        {/* Metric 2: RAM */}
        <div className="border border-cyan-500/30 bg-black/40 p-3 rounded-lg backdrop-blur-sm relative overflow-hidden group hover:border-cyan-400 transition-colors">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-mono tracking-wider">MEMORY</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-black font-mono text-cyan-300">
            {telemetry.hardware.ram_percent}%
          </div>
          <div className="text-[10px] text-gray-500 font-mono mt-1">
            {telemetry.hardware.ram_used_gb} / {telemetry.hardware.ram_total_gb} GB
          </div>
          <div className="w-full bg-cyan-950 h-1 mt-2 rounded overflow-hidden">
            <div
              className="bg-cyan-400 h-full transition-all duration-500"
              style={{ width: `${Math.min(100, telemetry.hardware.ram_percent)}%` }}
            />
          </div>
        </div>

        {/* Metric 3: Network I/O */}
        <div className="border border-cyan-500/30 bg-black/40 p-3 rounded-lg backdrop-blur-sm relative overflow-hidden group hover:border-cyan-400 transition-colors">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-mono tracking-wider">NETWORK I/O</span>
            <Wifi className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg font-black font-mono text-cyan-300">
            {telemetry.hardware.network.mb_recv} <span className="text-xs">MB</span>
          </div>
          <div className="text-[10px] text-gray-500 font-mono mt-1">
            ▲ {telemetry.hardware.network.kb_sent} KB | ▼ {telemetry.hardware.network.mb_recv} MB
          </div>
          <div className="w-full bg-cyan-950 h-1 mt-2 rounded overflow-hidden">
            <div className="bg-cyan-400 h-full w-2/3 animate-pulse" />
          </div>
        </div>

        {/* Metric 4: Tasks & Nexus */}
        <div className="border border-cyan-500/30 bg-black/40 p-3 rounded-lg backdrop-blur-sm relative overflow-hidden group hover:border-cyan-400 transition-colors">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-mono tracking-wider">TASK NEXUS</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-black font-mono text-cyan-300">
            {telemetry.database.active_tasks}{" "}
            <span className="text-xs text-gray-400 font-normal">/ {telemetry.database.total_tasks}</span>
          </div>
          <div className="text-[10px] text-gray-500 font-mono mt-1">
            Approvals: {telemetry.database.pending_approvals}
          </div>
          <div className="w-full bg-cyan-950 h-1 mt-2 rounded overflow-hidden">
            <div
              className="bg-emerald-400 h-full transition-all"
              style={{
                width: `${
                  telemetry.database.total_tasks > 0
                    ? (telemetry.database.active_tasks / telemetry.database.total_tasks) * 100
                    : 15
                }%`,
              }}
            />
          </div>
        </div>

        {/* Metric 5: Budget & Token Burn */}
        <div className="border border-cyan-500/30 bg-black/40 p-3 rounded-lg backdrop-blur-sm relative overflow-hidden group hover:border-cyan-400 transition-colors">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-mono tracking-wider">API SPEND</span>
            <Zap className={`w-4 h-4 ${isBudgetGated ? "text-rose-400" : "text-amber-400"}`} />
          </div>
          <div
            className={`text-xl font-black font-mono ${
              isBudgetGated ? "text-rose-400" : "text-amber-300"
            }`}
          >
            ₹{telemetry.budget.current_inr}{" "}
            <span className="text-xs text-gray-400 font-normal">/ ₹{telemetry.budget.monthly_limit_inr}</span>
          </div>
          <div className="text-[10px] text-gray-500 font-mono mt-1 truncate">
            Tokens: {(telemetry.budget as any).tokens_consumed || 0}
          </div>
          <div className="w-full bg-cyan-950 h-1 mt-2 rounded overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isBudgetGated ? "bg-rose-500" : "bg-amber-400"
              }`}
              style={{
                width: `${Math.min(
                  100,
                  (telemetry.budget.current_inr / telemetry.budget.monthly_limit_inr) * 100
                )}%`,
              }}
            />
          </div>
        </div>

        {/* Metric 6: Primary AI Provider */}
        <div className="border border-cyan-500/30 bg-black/40 p-3 rounded-lg backdrop-blur-sm relative overflow-hidden group hover:border-cyan-400 transition-colors">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-mono tracking-wider">PRIMARY AI</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-sm font-black font-mono text-cyan-300 uppercase truncate">
            {telemetry.ai_provider.name}
          </div>
          <div className="text-[10px] text-emerald-400 font-mono mt-1 truncate">
            {telemetry.ai_provider.model}
          </div>
          <div className="w-full bg-cyan-950 h-1 mt-2 rounded overflow-hidden">
            <div className="bg-emerald-400 h-full w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

