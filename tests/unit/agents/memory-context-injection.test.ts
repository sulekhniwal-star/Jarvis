import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatUserPromptWithContext } from "@/lib/agents/specifier/prompts";
import { formatSpecificationForPlanner } from "@/lib/agents/planner/prompts";
import { SpecifierAgent } from "@/lib/agents/specifier/specifier-agent";
import { PlannerAgent } from "@/lib/agents/planner/planner-agent";

describe("Agent Semantic Memory Context Injection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("formatUserPromptWithContext (Specifier)", () => {
    it("formats relevant project decisions and user preferences in prompt", () => {
      const prompt = formatUserPromptWithContext({
        rawPrompt: "Create authentication endpoint",
        relevantMemories: [
          {
            category: "user_preference",
            content: "Always use Supabase Auth for session tokens",
            similarity: 0.88,
          },
          {
            category: "project_decision",
            content: "Do not support third-party social auth providers in Phase 1",
            similarity: 0.82,
          },
        ],
      });

      expect(prompt).toContain("### Relevant Project Decisions & Preferences:");
      expect(prompt).toContain("[user_preference] [relevance: 88%] Always use Supabase Auth for session tokens");
      expect(prompt).toContain("[project_decision] [relevance: 82%] Do not support third-party social auth providers in Phase 1");
      expect(prompt).toContain("### User Task Prompt:\nCreate authentication endpoint");
    });
  });

  describe("formatSpecificationForPlanner (Planner)", () => {
    it("formats historical errors and architectural patterns in planner prompt", () => {
      const prompt = formatSpecificationForPlanner({
        taskId: "task-101",
        specification: {
          scope: "Build auth guard middleware",
          exclusions: "OAuth2 providers",
          acceptanceCriteria: [
            {
              id: "AC-1",
              title: "Protect /api/private routes",
              given: "Unauthenticated request",
              when: "GET /api/private is called",
              then: "Returns 401 Unauthorized",
            },
          ],
          assumptions: [],
        },
        relevantMemories: [
          {
            category: "architecture_pattern",
            content: "Use Next.js Edge middleware for fast route authentication",
            similarity: 0.91,
          },
          {
            category: "historical_error",
            content: "Avoid synchronous database queries inside Edge middleware",
            similarity: 0.85,
          },
        ],
      });

      expect(prompt).toContain("### Historical Errors to Avoid & Architectural Patterns:");
      expect(prompt).toContain("[architecture_pattern] [relevance: 91%] Use Next.js Edge middleware for fast route authentication");
      expect(prompt).toContain("[historical_error] [relevance: 85%] Avoid synchronous database queries inside Edge middleware");
      expect(prompt).toContain("### Approved Specification Scope:\nBuild auth guard middleware");
    });
  });

  describe("SpecifierAgent memory retrieval integration", () => {
    it("automatically queries memory repository when available and memories not pre-supplied", async () => {
      const mockSearchSimilarMemories = vi.fn().mockImplementation(async (params: any) => {
        if (params.category === "user_preference") {
          return [
            {
              id: "m-1",
              category: "user_preference",
              content: "Prefer arrow functions in React components",
              similarity: 0.89,
            },
          ];
        }
        return [
          {
            id: "m-2",
            category: "project_decision",
            content: "Enforce strict TypeScript without any types",
            similarity: 0.92,
          },
        ];
      });

      const mockMemoryRepo = {
        searchSimilarMemories: mockSearchSimilarMemories,
      } as any;

      const mockComplete = vi.fn().mockResolvedValue({
        content: JSON.stringify({
          status: "specified",
          ambiguity: {
            score: 0.1,
            dimensions: {
              goalClarity: 0.1,
              technicalBoundaries: 0.1,
              acceptanceMeasurability: 0.1,
              preconditions: 0.1,
            },
            reasoning: "Clear prompt",
          },
          specification: {
            scope: "Implement auth guard",
            exclusions: "Third-party social auth is completely excluded",
            acceptanceCriteria: [
              {
                id: "AC-1",
                title: "Valid session allowed",
                given: "Logged in user",
                when: "Navigates to dashboard",
                then: "Access granted",
              },
            ],
            assumptions: [],
          },
        }),
      });

      const mockAiGateway = {
        complete: mockComplete,
      } as any;

      const agent = new SpecifierAgent(mockAiGateway, mockMemoryRepo);

      await agent.specify({
        rawPrompt: "Implement auth guard",
        userId: "user-1",
        projectId: "proj-1",
      });

      expect(mockSearchSimilarMemories).toHaveBeenCalledTimes(2);

      // Verify the AI prompt received injected memories
      const callArgs = mockComplete.mock.calls[0][0];
      const userMessage = callArgs.messages.find((m: any) => m.role === "user");
      expect(userMessage.content).toContain("### Relevant Project Decisions & Preferences:");
      expect(userMessage.content).toContain("Enforce strict TypeScript without any types");
    });
  });

  describe("PlannerAgent memory retrieval integration", () => {
    it("automatically queries memory repository for patterns and historical errors", async () => {
      const mockSearchSimilarMemories = vi.fn().mockImplementation(async (params: any) => {
        if (params.category === "architecture_pattern") {
          return [
            {
              id: "m-3",
              category: "architecture_pattern",
              content: "Always run migrations idempotently",
              similarity: 0.94,
            },
          ];
        }
        return [
          {
            id: "m-4",
            category: "historical_error",
            content: "Never drop tables without pre-migration backup",
            similarity: 0.88,
          },
        ];
      });

      const mockMemoryRepo = {
        searchSimilarMemories: mockSearchSimilarMemories,
      } as any;

      const mockComplete = vi.fn().mockResolvedValue({
        content: JSON.stringify({
          steps: [
            {
              id: "step-1",
              title: "Create migration",
              description: "Add schema table",
              filesTargeted: ["supabase/migrations/01.sql"],
              actionType: "create",
              wave: 1,
              dependencies: [],
              riskLevel: "low",
              requiresApproval: false,
              verificationCommand: "npm test",
              rollbackProcedure: "git checkout",
            },
          ],
          dependencies: [],
          riskAssessment: {
            overallRisk: "low",
            riskFactors: [],
            requiresHumanApproval: false,
            mitigations: [],
          },
          requiredApprovals: [],
        }),
      });

      const mockAiGateway = {
        complete: mockComplete,
      } as any;

      const agent = new PlannerAgent(mockAiGateway, mockMemoryRepo);

      await agent.plan({
        taskId: "task-001",
        specification: {
          scope: "Create user preferences table",
          exclusions: "Foreign constraints",
          acceptanceCriteria: [
            {
              id: "AC-1",
              title: "Table created",
              given: "Database connection",
              when: "Migration runs",
              then: "Table exists",
            },
          ],
          assumptions: [],
        },
        userId: "user-1",
        projectId: "proj-1",
      });

      expect(mockSearchSimilarMemories).toHaveBeenCalledTimes(2);

      const callArgs = mockComplete.mock.calls[0][0];
      const userMessage = callArgs.messages.find((m: any) => m.role === "user");
      expect(userMessage.content).toContain("### Historical Errors to Avoid & Architectural Patterns:");
      expect(userMessage.content).toContain("Always run migrations idempotently");
    });
  });
});
