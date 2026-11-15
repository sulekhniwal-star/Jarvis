import { DependencyEdge, PlanStep } from "./types";

export class CircularDependencyError extends Error {
  constructor(message: string, public readonly cycle?: string[]) {
    super(message);
    this.name = "CircularDependencyError";
    Object.setPrototypeOf(this, CircularDependencyError.prototype);
  }
}

export class WaveOrderingError extends Error {
  constructor(
    message: string,
    public readonly stepId: string,
    public readonly dependencyId: string
  ) {
    super(message);
    this.name = "WaveOrderingError";
    Object.setPrototypeOf(this, WaveOrderingError.prototype);
  }
}

export interface DAGValidationResult {
  isValid: boolean;
  sortedStepIds: string[];
  maxWave: number;
  error?: string;
}

/**
 * Validates a Directed Acyclic Graph (DAG) of execution steps.
 * Detects circular dependencies, validates wave ordering, and produces topological sort.
 */
export function validateDAG(
  steps: PlanStep[],
  edges: DependencyEdge[]
): DAGValidationResult {
  if (steps.length === 0) {
    return {
      isValid: false,
      sortedStepIds: [],
      maxWave: 0,
      error: "Plan must contain at least one step.",
    };
  }

  const stepMap = new Map<string, PlanStep>();
  steps.forEach((step) => stepMap.set(step.id, step));

  // 1. Verify all dependency IDs exist
  for (const step of steps) {
    for (const depId of step.dependencies) {
      if (!stepMap.has(depId)) {
        return {
          isValid: false,
          sortedStepIds: [],
          maxWave: 0,
          error: `Step '${step.id}' depends on unknown step ID '${depId}'.`,
        };
      }
    }
  }

  // 2. Build adjacency list: from dependency (prerequisite) -> dependent steps
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  steps.forEach((s) => {
    adj.set(s.id, []);
    inDegree.set(s.id, 0);
  });

  // Reconcile declared dependencies from step.dependencies and edges
  const allEdges: DependencyEdge[] = [];
  const edgeSet = new Set<string>();

  const addEdge = (from: string, to: string) => {
    const key = `${from}->${to}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      allEdges.push({ from, to });
    }
  };

  edges.forEach((e) => addEdge(e.from, e.to));
  steps.forEach((s) => {
    s.dependencies.forEach((depId) => addEdge(depId, s.id));
  });

  for (const edge of allEdges) {
    if (!stepMap.has(edge.from) || !stepMap.has(edge.to)) {
      return {
        isValid: false,
        sortedStepIds: [],
        maxWave: 0,
        error: `Edge contains invalid step ID: ${edge.from} -> ${edge.to}`,
      };
    }
    adj.get(edge.from)!.push(edge.to);
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
  }

  // 3. Wave consistency check: for each edge from -> to, wave(to) > wave(from)
  for (const edge of allEdges) {
    const fromStep = stepMap.get(edge.from)!;
    const toStep = stepMap.get(edge.to)!;
    if (toStep.wave <= fromStep.wave) {
      return {
        isValid: false,
        sortedStepIds: [],
        maxWave: 0,
        error: `Wave ordering violation: Step '${toStep.id}' (wave ${toStep.wave}) depends on Step '${fromStep.id}' (wave ${fromStep.wave}). Dependent step wave must be strictly greater.`,
      };
    }
  }

  // 4. Cycle detection via Kahn's algorithm (Topological sort)
  const queue: string[] = [];
  inDegree.forEach((deg, id) => {
    if (deg === 0) queue.push(id);
  });

  const sortedStepIds: string[] = [];

  while (queue.length > 0) {
    const u = queue.shift()!;
    sortedStepIds.push(u);

    const neighbors = adj.get(u) ?? [];
    for (const v of neighbors) {
      const newDeg = (inDegree.get(v) ?? 1) - 1;
      inDegree.set(v, newDeg);
      if (newDeg === 0) {
        queue.push(v);
      }
    }
  }

  if (sortedStepIds.length !== steps.length) {
    return {
      isValid: false,
      sortedStepIds: [],
      maxWave: 0,
      error: "Circular dependency detected in execution graph.",
    };
  }

  const maxWave = Math.max(...steps.map((s) => s.wave), 1);

  return {
    isValid: true,
    sortedStepIds,
    maxWave,
  };
}
