import React from "react";
import { ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RiskAssessment } from "@/lib/agents/planner/types";

export interface PlanRiskBannerProps {
  riskAssessment: RiskAssessment;
  requiredApprovals: string[];
}

export function PlanRiskBanner({
  riskAssessment,
  requiredApprovals,
}: PlanRiskBannerProps) {
  const { overallRisk, riskFactors, requiresHumanApproval, mitigations } =
    riskAssessment;

  const getRiskDetails = () => {
    switch (overallRisk) {
      case "critical":
        return {
          icon: <ShieldAlert className="h-5 w-5 text-red-400" />,
          badgeVariant: "danger" as const,
          borderColor: "border-red-500/30",
          bgColor: "bg-red-950/20",
          title: "Critical Operational Risk Detected",
        };
      case "high":
        return {
          icon: <AlertTriangle className="h-5 w-5 text-amber-400" />,
          badgeVariant: "warning" as const,
          borderColor: "border-amber-500/30",
          bgColor: "bg-amber-950/20",
          title: "High Risk Actions Require Owner Review",
        };
      case "medium":
        return {
          icon: <AlertTriangle className="h-5 w-5 text-cyan-400" />,
          badgeVariant: "cyan" as const,
          borderColor: "border-cyan-500/30",
          bgColor: "bg-cyan-950/20",
          title: "Moderate Scope & Component Changes",
        };
      default:
        return {
          icon: <ShieldCheck className="h-5 w-5 text-emerald-400" />,
          badgeVariant: "success" as const,
          borderColor: "border-emerald-500/30",
          bgColor: "bg-emerald-950/20",
          title: "Low Risk — Standard Verification",
        };
    }
  };

  const details = getRiskDetails();

  return (
    <div
      className={`rounded-lg border ${details.borderColor} ${details.bgColor} p-4 space-y-4`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {details.icon}
          <div>
            <h3 className="text-sm font-semibold text-white">{details.title}</h3>
            <p className="text-xs text-slate-400">
              {requiresHumanApproval
                ? "This plan includes safety-sensitive actions requiring human authorization."
                : "All proposed actions operate within standard development boundaries."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={details.badgeVariant} className="uppercase font-mono text-xs">
            Risk: {overallRisk}
          </Badge>
          {requiresHumanApproval && (
            <Badge variant="warning" className="text-xs">
              Approval Gate Active
            </Badge>
          )}
        </div>
      </div>

      {/* Required Approvals & Risk Factors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/5 text-xs">
        {/* Left Column: Risk Factors & Approval Triggers */}
        <div className="space-y-2">
          {requiredApprovals.length > 0 && (
            <div>
              <span className="text-slate-400 font-medium">Approval Gates:</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {requiredApprovals.map((gate) => (
                  <Badge
                    key={gate}
                    variant="outline"
                    className="font-mono text-amber-300 border-amber-500/30 bg-amber-950/30"
                  >
                    {gate}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {riskFactors.length > 0 && (
            <div>
              <span className="text-slate-400 font-medium">Risk Factors:</span>
              <ul className="list-disc list-inside text-slate-300 mt-1 space-y-0.5">
                {riskFactors.map((factor, idx) => (
                  <li key={idx}>{factor}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column: Mitigations */}
        {mitigations.length > 0 && (
          <div className="space-y-1">
            <span className="text-slate-400 font-medium">Safety Mitigations:</span>
            <ul className="space-y-1 mt-1 text-slate-300">
              {mitigations.map((mitigation, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{mitigation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
