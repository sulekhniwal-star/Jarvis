import { describe, it, expect, vi, beforeEach } from "vitest";
import { AIGateway } from "@/lib/ai/gateway";
import { MockAIAdapter } from "@/lib/ai/adapters/mock";
import {
  SpecifierAgent,
  SpecifierValidationError,
} from "@/lib/agents/specifier/specifier-agent";
import {
  SpecifierAgentResponse,
  SpecifierInput,
} from "@/lib/agents/specifier/types";

describe("SpecifierAgent", () => {
  let mockAdapter: MockAIAdapter;
  let aiGateway: AIGateway;
  let specifierAgent: SpecifierAgent;

  beforeEach(() => {
    mockAdapter = new MockAIAdapter({
      simulatedLatencyMs: 5,
    });
    aiGateway = new AIGateway({
      adapter: mockAdapter,
    });
    specifierAgent = new SpecifierAgent(aiGateway);
  });

  it("produces status 'specified' for a clear, well-bounded prompt", async () => {
    const specifiedPayload: SpecifierAgentResponse = {
      status: "specified",
      ambiguity: {
        score: 0.12,
        dimensions: {
          goalClarity: 0.1,
          technicalBoundaries: 0.15,
          acceptanceMeasurability: 0.1,
          preconditions: 0.1,
        },
        reasoning: "Prompt clearly describes the target health check endpoint and response structure.",
      },
      specification: {
        scope: "Implement a GET /api/health endpoint in Next.js App Router returning JSON status: 'ok'.",
        exclusions: "No database ping or external monitoring checks in this version.",
        acceptanceCriteria: [
          {
            id: "AC-1",
            title: "Health endpoint returns 200 OK",
            given: "The Next.js server is running",
            when: "A client performs GET /api/health",
            then: "The server responds with HTTP 200 and { status: 'ok' }",
          },
        ],
        assumptions: ["Standard Next.js 15 route handler convention"],
      },
    };

    mockAdapter.setCustomHandler(() => JSON.stringify(specifiedPayload));

    const input: SpecifierInput = {
      rawPrompt: "Create a GET /api/health route that returns status ok.",
      projectId: "proj-123",
    };

    const result = await specifierAgent.specify(input);

    expect(result.status).toBe("specified");
    if (result.status === "specified") {
      expect(result.ambiguity.score).toBeLessThanOrEqual(0.35);
      expect(result.specification.scope).toContain("GET /api/health");
      expect(result.specification.exclusions).toBeDefined();
      expect(result.specification.acceptanceCriteria).toHaveLength(1);
      expect(result.specification.acceptanceCriteria[0]?.given).toBeDefined();
      expect(result.specification.acceptanceCriteria[0]?.when).toBeDefined();
      expect(result.specification.acceptanceCriteria[0]?.then).toBeDefined();
    }
  });

  it("produces status 'needs_clarification' for an ambiguous or underspecified prompt", async () => {
    const clarificationPayload: SpecifierAgentResponse = {
      status: "needs_clarification",
      ambiguity: {
        score: 0.65,
        dimensions: {
          goalClarity: 0.7,
          technicalBoundaries: 0.8,
          acceptanceMeasurability: 0.6,
          preconditions: 0.5,
        },
        reasoning: "The prompt only asks to 'add auth' without specifying providers, session models, or target routes.",
      },
      questions: [
        {
          id: "Q-1",
          question: "Which authentication provider should be used?",
          rationale: "Supabase Auth and custom JWT require different configurations.",
          options: ["Supabase Auth (Recommended)", "NextAuth", "Custom JWT"],
          recommendedOption: "Supabase Auth (Recommended)",
        },
        {
          id: "Q-2",
          question: "Which routes should be protected?",
          rationale: "Determines middleware configuration.",
          options: ["All /dashboard/* routes", "API routes only", "Entire site"],
          recommendedOption: "All /dashboard/* routes",
        },
      ],
    };

    mockAdapter.setCustomHandler(() => JSON.stringify(clarificationPayload));

    const input: SpecifierInput = {
      rawPrompt: "Add auth to the app.",
      projectId: "proj-123",
    };

    const result = await specifierAgent.specify(input);

    expect(result.status).toBe("needs_clarification");
    if (result.status === "needs_clarification") {
      expect(result.ambiguity.score).toBeGreaterThan(0.35);
      expect(result.questions).toHaveLength(2);
      expect(result.questions[0]?.id).toBe("Q-1");
      expect(result.questions[0]?.question).toContain("authentication provider");
      expect(result.questions[0]?.recommendedOption).toBeDefined();
    }
  });

  it("resolves ambiguity when clarification answers are supplied", async () => {
    const resolvedPayload: SpecifierAgentResponse = {
      status: "specified",
      ambiguity: {
        score: 0.18,
        dimensions: {
          goalClarity: 0.15,
          technicalBoundaries: 0.2,
          acceptanceMeasurability: 0.2,
          preconditions: 0.15,
        },
        reasoning: "Authentication questions answered: Supabase Auth with /dashboard protection.",
      },
      specification: {
        scope: "Implement Supabase Auth session validation protecting /dashboard routes via middleware.",
        exclusions: "OAuth social providers (Google/GitHub) are excluded in this phase.",
        acceptanceCriteria: [
          {
            id: "AC-1",
            title: "Unauthenticated redirect",
            given: "An unauthenticated user session",
            when: "The user navigates to /dashboard",
            then: "The user is redirected to /login with a 307 redirect",
          },
        ],
        assumptions: ["Supabase credentials present in environment"],
      },
    };

    let receivedMessages: unknown[] = [];
    mockAdapter.setCustomHandler((req) => {
      receivedMessages = req.messages;
      return JSON.stringify(resolvedPayload);
    });

    const input: SpecifierInput = {
      rawPrompt: "Add auth to the app.",
      projectId: "proj-123",
    };

    const answers = [
      {
        questionId: "Q-1",
        question: "Which authentication provider should be used?",
        answer: "Supabase Auth",
      },
      {
        questionId: "Q-2",
        question: "Which routes should be protected?",
        answer: "All /dashboard/* routes",
      },
    ];

    const result = await specifierAgent.specifyWithClarifications(input, answers);

    expect(result.status).toBe("specified");
    // Verify answers were injected into the prompt
    const userMessage = receivedMessages.find(
      (m: any) => m.role === "user"
    ) as any;
    expect(userMessage.content).toContain("Q-1");
    expect(userMessage.content).toContain("Supabase Auth");
    expect(userMessage.content).toContain("All /dashboard/* routes");
  });

  it("strips markdown code fences from JSON output", async () => {
    const rawWithFences = `\`\`\`json
{
  "status": "specified",
  "ambiguity": {
    "score": 0.2,
    "dimensions": {
      "goalClarity": 0.2,
      "technicalBoundaries": 0.2,
      "acceptanceMeasurability": 0.2,
      "preconditions": 0.2
    },
    "reasoning": "Valid prompt."
  },
  "specification": {
    "scope": "Build user profile header component with avatar and username.",
    "exclusions": "Profile editing is excluded.",
    "acceptanceCriteria": [
      {
        "id": "AC-1",
        "title": "Avatar render",
        "given": "User is signed in",
        "when": "Header renders",
        "then": "Avatar image is displayed"
      }
    ],
    "assumptions": []
  }
}
\`\`\``;

    mockAdapter.setCustomHandler(() => rawWithFences);

    const result = await specifierAgent.specify({
      rawPrompt: "Build user profile header component",
    });

    expect(result.status).toBe("specified");
  });

  it("throws SpecifierValidationError when LLM output violates schema", async () => {
    // Missing Given-When-Then in acceptanceCriteria
    const invalidPayload = {
      status: "specified",
      ambiguity: {
        score: 0.2,
        dimensions: {
          goalClarity: 0.2,
          technicalBoundaries: 0.2,
          acceptanceMeasurability: 0.2,
          preconditions: 0.2,
        },
        reasoning: "Incomplete schema.",
      },
      specification: {
        scope: "Too short", // Violates min(10)
        exclusions: "None", // Violates min(5)
        acceptanceCriteria: [], // Violates min(1)
      },
    };

    mockAdapter.setCustomHandler(() => JSON.stringify(invalidPayload));

    await expect(
      specifierAgent.specify({ rawPrompt: "Invalid" })
    ).rejects.toThrow(SpecifierValidationError);
  });

  it("throws SpecifierValidationError when LLM output is not valid JSON", async () => {
    mockAdapter.setCustomHandler(() => "Not JSON at all! Just conversational text.");

    await expect(
      specifierAgent.specify({ rawPrompt: "Hello" })
    ).rejects.toThrow(SpecifierValidationError);
  });
});
