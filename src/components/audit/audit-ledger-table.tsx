"use client";

import * as React from "react";
import { Search, ChevronDown, ChevronRight, Hash, Shield, Clock, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AuditEventRecord } from "@/lib/audit/audit-ledger";

export interface AuditLedgerTableProps {
  events: AuditEventRecord[];
  className?: string;
}

export function AuditLedgerTable({ events, className = "" }: AuditLedgerTableProps) {
  const [search, setSearch] = React.useState("");
  const [selectedType, setSelectedType] = React.useState<string>("all");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const eventTypes = React.useMemo(() => {
    const types = new Set<string>();
    events.forEach((e) => types.add(e.event_type));
    return Array.from(types).sort();
  }, [events]);

  const filteredEvents = React.useMemo(() => {
    return events.filter((e) => {
      const matchesType = selectedType === "all" || e.event_type === selectedType;
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        e.resource_id.toLowerCase().includes(q) ||
        e.resource_type.toLowerCase().includes(q) ||
        e.event_type.toLowerCase().includes(q) ||
        e.hash.toLowerCase().includes(q) ||
        JSON.stringify(e.details).toLowerCase().includes(q);

      return matchesType && matchesSearch;
    });
  }, [events, search, selectedType]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getEventTypeBadgeVariant = (
    type: string
  ): "success" | "warning" | "danger" | "cyan" | "ice" | "outline" => {
    if (
      type.includes("kill") ||
      type.includes("emergency") ||
      type.includes("reject") ||
      type.includes("fail")
    ) {
      return "danger";
    }
    if (type.includes("approval") || type.includes("approved")) {
      return "success";
    }
    if (type.includes("backup") || type.includes("recovery")) {
      return "cyan";
    }
    if (type.includes("warn")) {
      return "warning";
    }
    return "outline";
  };

  return (
    <div className={`space-y-4 ${className}`} data-testid="audit-ledger-container">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-surface-1 border border-surface-3 rounded-xl shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources, hashes..."
            className="w-full pl-9 pr-3 h-9 text-xs rounded-lg border border-surface-3 bg-surface-2 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-cyan"
            aria-label="Filter audit events by search text"
            data-testid="audit-search-input"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-text-secondary shrink-0" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full sm:w-48 h-9 text-xs px-2.5 rounded-lg border border-surface-3 bg-surface-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-cyan"
            aria-label="Filter by event type"
            data-testid="audit-type-select"
          >
            <option value="all">All Event Types ({events.length})</option>
            {eventTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Table */}
      <div className="border border-surface-3 rounded-xl overflow-hidden bg-surface-1 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" role="table">
            <thead className="bg-surface-2/60 border-b border-surface-3 text-text-secondary font-mono">
              <tr>
                <th className="py-2.5 px-3 w-16">Seq</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Event Type</th>
                <th className="py-2.5 px-3">Resource</th>
                <th className="py-2.5 px-3">Prev Hash</th>
                <th className="py-2.5 px-3">Block Hash</th>
                <th className="py-2.5 px-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-3 font-mono">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-secondary text-xs">
                    No audit records matching selected criteria.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => {
                  const isExpanded = expandedId === event.id;
                  const formattedTime = new Date(event.created_at).toLocaleString();

                  return (
                    <React.Fragment key={event.id}>
                      <tr
                        className={`hover:bg-surface-2/40 transition-colors cursor-pointer ${
                          isExpanded ? "bg-surface-2/30" : ""
                        }`}
                        onClick={() => toggleExpand(event.id)}
                        data-testid={`audit-row-${event.id}`}
                      >
                        <td className="py-2.5 px-3 font-bold text-accent-cyan">
                          #{event.sequence}
                        </td>
                        <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap">
                          {formattedTime}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <Badge variant={getEventTypeBadgeVariant(event.event_type)}>
                            {event.event_type}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="text-text-primary font-medium">
                            {event.resource_type}:
                          </span>
                          <span className="text-text-secondary ml-1">
                            {event.resource_id.slice(0, 12)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-text-secondary whitespace-nowrap">
                          <span title={event.prev_hash}>
                            {event.prev_hash.slice(0, 8)}...
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-accent-cyan whitespace-nowrap">
                          <span title={event.hash} className="bg-accent-cyan/10 px-1.5 py-0.5 rounded border border-accent-cyan/20">
                            {event.hash ? `${event.hash.slice(0, 8)}...` : "None"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            className="p-1 rounded text-text-secondary hover:text-text-primary"
                            aria-label={`Toggle details for event ${event.id}`}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-surface-2/20">
                          <td colSpan={7} className="p-4 border-t border-surface-3">
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-text-secondary">Full Block Hash: </span>
                                  <code className="text-[11px] text-accent-cyan bg-surface-1 p-1 rounded border border-surface-3 break-all">
                                    {event.hash}
                                  </code>
                                </div>
                                <div>
                                  <span className="text-text-secondary">Previous Block Hash: </span>
                                  <code className="text-[11px] text-text-secondary bg-surface-1 p-1 rounded border border-surface-3 break-all">
                                    {event.prev_hash}
                                  </code>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <span className="text-xs font-semibold text-text-primary">
                                  Canonical Payload Details:
                                </span>
                                <pre className="p-3 bg-surface-1 border border-surface-3 rounded-lg text-[11px] text-text-secondary overflow-x-auto">
                                  {JSON.stringify(event.details, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
