import * as React from "react";
import { Activity, CheckCircle2, Clock, AlertTriangle, GitCommit } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { EmptyState } from "../ui/empty-state";

export interface ActivityEventItem {
  id: string;
  type: "run_completed" | "run_started" | "run_failed" | "approval_decided" | "git_commit";
  title: string;
  summary?: string;
  gitCommitHash?: string | null;
  timestamp: string;
}

export interface RecentActivityFeedProps {
  events?: ActivityEventItem[];
}

export function RecentActivityFeed({ events = [] }: RecentActivityFeedProps) {
  const count = events.length;

  const getEventIcon = (type: ActivityEventItem["type"]) => {
    switch (type) {
      case "run_completed":
        return <CheckCircle2 className="w-4 h-4 text-success" aria-hidden="true" />;
      case "run_started":
        return <Clock className="w-4 h-4 text-accent-cyan" aria-hidden="true" />;
      case "run_failed":
        return <AlertTriangle className="w-4 h-4 text-danger" aria-hidden="true" />;
      case "git_commit":
        return <GitCommit className="w-4 h-4 text-accent-ice" aria-hidden="true" />;
      default:
        return <Activity className="w-4 h-4 text-text-secondary" aria-hidden="true" />;
    }
  };

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent-cyan" aria-hidden="true" />
            <CardTitle className="text-base font-semibold">Activity Stream</CardTitle>
          </div>
          <Badge variant="outline">Live Feed</Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-center">
        {count === 0 ? (
          <EmptyState
            icon={Activity}
            title="No Activity Events"
            description="Autonomous executions, code changes, and approval events will stream here in real time."
            className="border-none bg-transparent p-4"
          />
        ) : (
          <div className="space-y-3">
            {events.slice(0, 5).map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-surface-2/40 border border-surface-3/60 text-xs"
              >
                <div className="mt-0.5">{getEventIcon(event.type)}</div>
                <div className="flex-1 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text-primary">
                      {event.title}
                    </span>
                    <span className="text-[11px] text-text-secondary">
                      {new Date(event.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {event.summary && (
                    <p className="text-text-secondary text-[11px] line-clamp-1">
                      {event.summary}
                    </p>
                  )}
                  {event.gitCommitHash && (
                    <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px] text-accent-ice">
                      <GitCommit className="w-3 h-3" />
                      <span>{event.gitCommitHash.substring(0, 7)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
