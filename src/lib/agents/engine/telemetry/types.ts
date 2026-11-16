import {
  TaskExecutionStatus,
  TestSummary,
} from "../types";
import { PlanStep } from "../../planner/types";

export interface ExecutionRunSummary {
  runId: string;
  taskId: string;
  status: TaskExecutionStatus;
  commitHash?: string;
  diffPatch?: string;
  durationMs: number;
  testSummary: TestSummary;
  artifactCount: number;
  errorDetails?: string;
}

export interface CoordinatorExecutionParams {
  taskId: string;
  step: PlanStep;
  project: {
    slug: string;
    repositoryUrl: string;
    name?: string;
  };
  taskContext?: {
    title?: string;
    description?: string;
    userPrompt?: string;
  };
  acceptanceCriteria?: string[];
  env?: Record<string, string>;
  metadata?: Record<string, unknown>;
  maxRetries?: number;
}
