"use client";

import * as React from "react";
import { Search, Filter, Cpu, Check, Inbox } from "lucide-react";
import { CostRecord } from "@/types/database";
import { EmptyState } from "@/components/ui/empty-state";

export interface CostLedgerTableProps {
  records: CostRecord[];
  isLoading?: boolean;
}

export function CostLedgerTable({
  records = [],
  isLoading = false,
}: CostLedgerTableProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedModel, setSelectedModel] = React.useState("all");

  const modelOptions = React.useMemo(() => {
    const set = new Set<string>();
    for (const r of records) {
      if (r.model) set.add(r.model);
    }
    return Array.from(set);
  }, [records]);

  const filteredRecords = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter((r) => {
      if (selectedModel !== "all" && r.model !== selectedModel) {
        return false;
      }
      if (q) {
        const matchModel = r.model.toLowerCase().includes(q);
        const matchProvider = r.provider.toLowerCase().includes(q);
        const matchRun = r.run_id?.toLowerCase().includes(q) ?? false;
        if (!matchModel && !matchProvider && !matchRun) return false;
      }
      return true;
    });
  }, [records, selectedModel, searchQuery]);

  return (
    <div className="space-y-4" data-testid="cost-ledger-table">
      {/* Table Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Cpu className="w-4 h-4 text-accent-cyan" aria-hidden="true" />
          Inference Cost Ledger ({filteredRecords.length} records)
        </h4>

        <div className="flex items-center gap-2">
          {/* Model Filter */}
          {modelOptions.length > 0 && (
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              aria-label="Filter by model"
              className="text-xs bg-surface-2 border border-surface-3 rounded-lg px-2.5 py-1.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-cyan"
              data-testid="cost-model-filter"
            >
              <option value="all">All Models</option>
              {modelOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search model, provider..."
              aria-label="Search cost records"
              className="text-xs pl-8 pr-3 py-1.5 bg-surface-2 border border-surface-3 rounded-lg text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent-cyan w-48 sm:w-56"
              data-testid="cost-search-input"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {filteredRecords.length > 0 ? (
        <div className="border border-surface-3 rounded-xl overflow-hidden bg-surface-1">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2 border-b border-surface-3 text-[11px] font-mono uppercase text-text-secondary">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Model & Provider</th>
                  <th className="py-2.5 px-4 text-right">Prompt</th>
                  <th className="py-2.5 px-4 text-right">Completion</th>
                  <th className="py-2.5 px-4 text-right">Total Tokens</th>
                  <th className="py-2.5 px-4 text-right">Cost (INR)</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-3/50 font-mono">
                {filteredRecords.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-surface-2/40 transition-colors"
                  >
                    <td className="py-2.5 px-4 text-text-secondary whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2.5 px-4 font-sans">
                      <div className="font-medium text-text-primary">
                        {r.model}
                      </div>
                      <div className="text-[10px] text-text-secondary font-mono">
                        {r.provider}
                        {r.run_id && ` • run:${r.run_id.slice(0, 8)}`}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right text-text-secondary">
                      {r.prompt_tokens.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right text-text-secondary">
                      {r.completion_tokens.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right text-text-primary font-semibold">
                      {r.total_tokens.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-accent-cyan">
                      ₹{Number(r.cost_inr).toFixed(4)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`inline-block px-1.5 py-0.2 rounded text-[10px] ${
                          r.is_estimated
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {r.is_estimated ? "Est." : "Exact"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No cost records found"
          description={
            searchQuery || selectedModel !== "all"
              ? "No ledger records match the selected filter criteria."
              : "No paid or tracked AI inference requests have been recorded yet."
          }
          icon={Inbox}
        />
      )}
    </div>
  );
}
