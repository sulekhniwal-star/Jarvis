# JARVIS — Coding Agent Interface & Sandbox Protocol

**Document:** `docs/CODING_AGENT_INTERFACE.md`  
**Version:** 1.0  
**Status:** Approved Baseline  
**Date:** 2026-11-15  

---

## 1. Interface Objective & Design Philosophy

The Coding Agent Interface decouples the Jarvis orchestration platform from specific AI coding tools. By wrapping code-generation engines behind a uniform, provider-agnostic interface, Jarvis ensures that:
1. Coding engines (e.g., Aider, OpenHands, custom LLM tool-calling loops) can be replaced or upgraded without refactoring core orchestrator workflows.
2. Code generation and test execution occur in strictly isolated, ephemeral sandbox environments.
3. Untrusted repository code or prompt-injected packages can never exfiltrate master credentials or compromise host infrastructure.

---

## 2. Standard TypeScript Adapter Contract

```typescript
export interface CodingTaskContext {
  taskId: string;
  runId: string;
  projectSlug: string;
  repositoryUrl: string;
  targetBranch: 'main';
  scopedInstructions: string;
  allowedFilePatterns: string[];
  maxRetries: number;
}

export interface ExecutionArtifact {
  name: string;
  artifactType: 'test_log' | 'build_log' | 'diff' | 'screenshot';
  content: string | Buffer;
  mimeType: string;
}

export interface CodingTaskResult {
  runId: string;
  status: 'success' | 'test_failure' | 'timeout' | 'error';
  exitCode: number;
  commitHash?: string;
  diffPatch?: string;
  testSummary: {
    passed: number;
    failed: number;
    durationMs: number;
  };
  artifacts: ExecutionArtifact[];
  errorDetails?: string;
}

export interface ICodingAgentEngine {
  readonly engineName: string;
  executeTask(context: CodingTaskContext): Promise<CodingTaskResult>;
  validateEnvironment(): Promise<boolean>;
}
```

---

## 3. Aider CLI Adapter Implementation

Aider is the initial candidate coding agent engine. It is wrapped inside an adapter that:
1. Generates an ephemeral `.aider.conf.yml` specifying:
   - Git commit message conventions (`type(scope): description`).
   - Read-only file constraints for files outside `allowedFilePatterns`.
   - Provider settings targeting OpenRouter (`OPENROUTER_API_KEY`).
2. Invokes Aider in non-interactive batch mode:
   ```bash
   aider \
     --model openrouter/qwen/qwen-2.5-coder-32b-instruct \
     --yes-always \
     --no-show-model-warnings \
     --message-file ./instructions.txt \
     ./src/target_file.ts
   ```
3. Extracts the resulting commit hash, git diff, and status.

---

## 4. Sandbox Isolation & Credential Security

### Runner Architecture:
- Code execution runs inside **GitHub Actions ephemeral runners** using Docker containers (`ubuntu-latest`).
- **No Master Secrets:**
  - The master database connection string (`DATABASE_URL`) is never exposed to the runner.
  - The master Supabase `service_role` key is never mounted in the runner container.
  - The OpenRouter API key provided to the runner is a scoped, rate-limited key or proxied through the Jarvis API.
  - The GitHub token provided to the runner is an ephemeral installation token scoped strictly to read/write on the specific target repository.
- **Teardown & Cleanup:**
  - Upon task completion, the runner container and workspace are completely wiped, preventing persistence of malicious state or cached credentials.

---

## 5. Bounded Repair Protocol (3-Strike Rule)

When tests fail following a code modification:
1. **Strike 1:** The Verifier captures the exact test error stack trace. The Coder agent is invoked with the specific failure log and asked to provide a targeted fix.
2. **Strike 2:** If the subsequent test run fails, the Reviewer analyzes the diff for unintended side effects or missed dependencies. A targeted repair plan is executed.
3. **Strike 3:** If tests fail a third time, the execution is automatically terminated.
4. **Action on Strike 3:**
   - The task is marked as `FAILED`.
   - The git working tree in the sandbox is reverted to the base commit.
   - A detailed diagnostic report is generated and sent to the owner via dashboard and Telegram.
   - Jarvis halts and waits for human guidance.
