# Coding Agent Interface & Runner Specification: Jarvis Autonomous Personal AI

**Document Version:** 1.0.0  
**Status:** Approved for Milestone 0  
**System Name:** Jarvis Autonomous Personal AI Software-Building System  
**Author:** Staff Backend Engineer & AI-Agent Engineer  
**Date:** November 14, 2026  

---

## 1. Abstraction Philosophy

The execution of automated code generation must remain fully decoupled from the underlying agent tool. While `Aider CLI` serves as the initial coding-agent adapter for the MVP, the Jarvis architecture enforces an abstract, pluggable interface (`ICodingAgentAdapter`). This ensures the system can seamlessly adopt or benchmark other coding agents (e.g., custom AST agents, Claude Code, OpenHands) without altering the Agent Orchestrator or runner dispatch pipelines.

---

## 2. Core TypeScript Contract (`ICodingAgentAdapter`)

Defined in `packages/core/src/interfaces/coding-agent.ts`:

```typescript
export interface CodingAgentTaskOptions {
  modelId: string;
  provider: 'openrouter' | 'anthropic' | 'openai';
  apiKey: string;
  timeoutMs: number;
  maxTokens?: number;
  dryRun?: boolean;
  allowedFiles?: string[];
  disallowedPatterns?: string[];
}

export interface CodingAgentResult {
  success: boolean;
  filesModified: string[];
  filesCreated: string[];
  filesDeleted: string[];
  gitCommitSha?: string;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
    providerGenerationId?: string;
  };
  rawLogs: string;
  errorMessage?: string;
}

export interface ICodingAgentAdapter {
  readonly adapterName: string;
  
  initialize(workspacePath: string): Promise<void>;
  
  executeTask(
    prompt: string, 
    contextFiles: string[], 
    options: CodingAgentTaskOptions
  ): Promise<CodingAgentResult>;
  
  verifyHealth(): Promise<boolean>;
  
  cleanup(): Promise<void>;
}
```

---

## 3. Aider Adapter Implementation Details

The default implementation (`AiderCliAdapter`) lives in `workers/coding-agent/src/adapters/aider.ts`.

### 3.1 Command Construction
When executing a task, the adapter runs Aider in headless, non-interactive mode:

```bash
aider \
  --message "$PROMPT" \
  --yes-always \
  --no-auto-commits \
  --model openrouter/$MODEL_NAME \
  --subtree-only \
  $CONTEXT_FILES
```

### 3.2 Flag Justification
- `--message "$PROMPT"`: Transmits the instruction directly and exits immediately upon completion.
- `--yes-always`: Suppresses all interactive prompts (file creation, confirmations).
- `--no-auto-commits`: Disables Aider's automated git commits. This allows the Jarvis runner to perform QA tests and linting *before* crafting a structured, conventional git commit.
- `--model openrouter/$MODEL_NAME`: Directs API calls through OpenRouter's gateway.
- `--subtree-only`: Restricts Aider's file access strictly to the target project directory.

### 3.3 Environment Variable Isolation
The Aider process is launched in a sanitized environment with only necessary variables:
```bash
OPENROUTER_API_KEY="sk-or-v1-..."
GIT_AUTHOR_NAME="Jarvis Autonomous Agent"
GIT_AUTHOR_EMAIL="jarvis-agent@internal.local"
```
No database credentials, GitHub App private keys, or host secrets are present in the runner environment.

---

## 4. Git Diff & Change Extraction

Following Aider's execution, the adapter programmatically queries git state to construct a precise manifest of changes:
1. `git status --porcelain` to identify modified, untracked, and deleted files.
2. File path filtering against security blacklists:
   - Prohibited: `.github/workflows/**`, `.env*`, `package.json` scripts that invoke elevated shell commands.
3. If prohibited modifications are detected, the adapter halts execution and escalates a security alert.

---

## 5. Extensibility & Future Adapters

To integrate an alternative coding agent (e.g., `CustomTreeSitterAdapter`):
1. Implement the `ICodingAgentAdapter` contract.
2. Register the adapter in the `AgentAdapterRegistry`.
3. Select the adapter via project settings (`user_preferences.default_coding_adapter`).
