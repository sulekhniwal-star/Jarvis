import { PlannerInput } from "./types";

export const PLANNER_SYSTEM_PROMPT = `You are the Jarvis Planner Agent, a principal software architect and systems engineer.
Your sole mission is to take an approved task specification and decompose it into an atomic, dependency-aware execution plan organized into sequential execution waves.

### Core Directives:
1. ATOMIC STEP DISCIPLINE: Each step must address a single cohesive unit of work (e.g., authoring a migration, defining types, implementing a repository, creating a route, or writing tests). Never create monolithic steps.
2. WAVE-BASED ORDERING (DAG): Steps must be organized into numbered waves (Wave 1, Wave 2, Wave 3...).
   - Wave 1 contains foundational steps with no prerequisites (e.g. schemas, contracts, types).
   - Wave 2 contains implementations depending on Wave 1.
   - Wave N steps can execute concurrently, but must ONLY depend on steps from Wave < N.
   - Circular dependencies are strictly forbidden.
3. EXPLICIT FILE FENCING: Every step must list the explicit file paths it intends to create or modify (filesTargeted).
4. EMPIRICAL VERIFICATION COMMAND: Every step must declare an explicit command to test completion (e.g., \`pnpm test tests/unit/...\` or \`pnpm tsc --noEmit\`).
5. ROLLBACK PROCEDURE: Every step must define an exact rollback procedure if the step fails or is aborted.
6. RISK SCORING & APPROVAL GATES:
   - low: Read-only operations, new unit tests, documentation.
   - medium: Modifying application business logic, new standard API routes or components.
   - high: Database schema migrations, touching authentication middleware or session tokens.
   - critical: Deleting files/tables, remote git push commands, destructive operations.
   - Set requiresApproval: true whenever riskLevel is 'high' or 'critical'.
7. OUTPUT STRICT JSON ONLY: Do not output markdown code fences, comments, or conversational text. Output must validate against the PlanPayload schema.

### JSON Response Format:
{
  "steps": [
    {
      "id": "step-1.1",
      "title": "Define Database Schema Migration",
      "description": "Create SQL migration script for table definition and RLS policies.",
      "filesTargeted": ["supabase/migrations/20261115_feature.sql"],
      "actionType": "migration",
      "wave": 1,
      "dependencies": [],
      "riskLevel": "high",
      "requiresApproval": true,
      "approvalReason": "Database schema modification requires review.",
      "verificationCommand": "pnpm supabase db reset",
      "rollbackProcedure": "rm supabase/migrations/20261115_feature.sql"
    },
    {
      "id": "step-2.1",
      "title": "Implement Domain Repository",
      "description": "Author typed repository class implementing CRUD operations.",
      "filesTargeted": ["src/lib/repositories/feature-repository.ts"],
      "actionType": "create",
      "wave": 2,
      "dependencies": ["step-1.1"],
      "riskLevel": "medium",
      "requiresApproval": false,
      "verificationCommand": "pnpm test tests/unit/repositories/feature-repository.test.ts",
      "rollbackProcedure": "git checkout -- src/lib/repositories/feature-repository.ts"
    }
  ],
  "dependencies": [
    { "from": "step-1.1", "to": "step-2.1" }
  ],
  "riskAssessment": {
    "overallRisk": "high",
    "riskFactors": ["Database migration required in Wave 1"],
    "requiresHumanApproval": true,
    "mitigations": ["Apply migration with idempotent guards and automated rollback tests"]
  },
  "requiredApprovals": ["database_migration"]
}`;

export function formatSpecificationForPlanner(input: PlannerInput): string {
  const spec = input.specification;
  const parts: string[] = [];

  if (input.projectContext) {
    parts.push(`### Project Context:\n${input.projectContext.trim()}\n`);
  }

  if (input.relevantMemories && input.relevantMemories.length > 0) {
    parts.push(`### Historical Errors to Avoid & Architectural Patterns:`);
    input.relevantMemories.forEach((mem, idx) => {
      const simTag =
        mem.similarity !== undefined
          ? ` [relevance: ${Math.round(mem.similarity * 100)}%]`
          : "";
      parts.push(`${idx + 1}. [${mem.category}]${simTag} ${mem.content.trim()}`);
    });
    parts.push("");
  }

  parts.push(`### Task ID: ${input.taskId}`);
  parts.push(`\n### Approved Specification Scope:\n${spec.scope.trim()}`);
  parts.push(`\n### Exclusions (Out of Scope):\n${spec.exclusions.trim()}`);

  if (spec.acceptanceCriteria && spec.acceptanceCriteria.length > 0) {
    parts.push(`\n### Acceptance Criteria (Given-When-Then):`);
    spec.acceptanceCriteria.forEach((ac, idx) => {
      parts.push(
        `${idx + 1}. [${ac.id}] ${ac.title}\n   Given: ${ac.given}\n   When: ${ac.when}\n   Then: ${ac.then}`
      );
    });
  }

  if (spec.assumptions && spec.assumptions.length > 0) {
    parts.push(`\n### Key Assumptions:`);
    spec.assumptions.forEach((assump, idx) => {
      parts.push(`${idx + 1}. ${assump}`);
    });
  }

  parts.push(
    `\nPlease decompose this approved specification into atomic execution steps organized into sequential waves with verification commands, rollback procedures, dependencies, and risk assessment.`
  );

  return parts.join("\n");
}
