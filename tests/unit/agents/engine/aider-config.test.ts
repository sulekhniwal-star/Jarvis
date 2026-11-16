import { describe, it, expect } from "vitest";
import {
  synthesizeAiderArgs,
  generateAiderYamlConfig,
  AiderConfigSynthesizer,
  DEFAULT_AIDER_MODEL,
} from "@/lib/agents/engine/aider/config-synthesizer";
import {
  parseAiderOutput,
  extractExecutionArtifacts,
  AiderOutputParser,
} from "@/lib/agents/engine/aider/output-parser";
import { CodingTaskContext } from "@/lib/agents/engine/types";
import { AiderProcessResult } from "@/lib/agents/engine/aider/types";

describe("Aider Configuration Synthesizer", () => {
  const sampleContext: CodingTaskContext = {
    taskId: "11111111-1111-4111-8111-111111111111",
    runId: "22222222-2222-4222-8222-222222222222",
    stepId: "step-1",
    projectSlug: "jarvis",
    repositoryUrl: "https://github.com/sulekhniwal-star/Jarvis.git",
    targetBranch: "main",
    scopedInstructions: "Add headless aider execution adapter.",
    allowedFilePatterns: ["src/lib/agents/engine/aider/adapter.ts"],
    maxRetries: 3,
    environmentVariables: {
      OPENROUTER_API_KEY: "sk-or-v1-fake-token",
    },
  };

  it("synthesizes base headless arguments and maps allowed files as positional args", () => {
    const args = synthesizeAiderArgs(sampleContext);

    expect(args).toContain("--yes-always");
    expect(args).toContain("--no-show-model-warnings");
    expect(args).toContain("--no-analytics");
    expect(args).toContain("--no-check-update");
    expect(args).toContain("--model");
    expect(args).toContain(DEFAULT_AIDER_MODEL);
    expect(args).toContain("--openai-api-key");
    expect(args).toContain("sk-or-v1-fake-token");
    expect(args).toContain("--message");
    expect(args).toContain("Add headless aider execution adapter.");

    // Positional target file at end
    expect(args[args.length - 1]).toBe("src/lib/agents/engine/aider/adapter.ts");
  });

  it("supports read-only files and message files", () => {
    const args = synthesizeAiderArgs(sampleContext, {
      readOnlyFiles: ["docs/CODING_AGENT_INTERFACE.md", "src/types/database.ts"],
      messageFile: "./temp/instructions.txt",
      autoCommits: false,
    });

    expect(args).toContain("--read");
    expect(args).toContain("docs/CODING_AGENT_INTERFACE.md");
    expect(args).toContain("src/types/database.ts");
    expect(args).toContain("--message-file");
    expect(args).toContain("./temp/instructions.txt");
    expect(args).toContain("--no-auto-commits");
  });

  it("generates valid .aider.conf.yml YAML content", () => {
    const yaml = generateAiderYamlConfig(sampleContext, {
      readOnlyFiles: ["docs/SPEC.md"],
      commitPrompt: "feat(aider): implement batch mode",
    });

    expect(yaml).toContain(`model: ${DEFAULT_AIDER_MODEL}`);
    expect(yaml).toContain("yes-always: true");
    expect(yaml).toContain("show-model-warnings: false");
    expect(yaml).toContain("commit-prompt: \"feat(aider): implement batch mode\"");
    expect(yaml).toContain("read:\n  - docs/SPEC.md");
  });

  it("class wrapper delegates methods correctly", () => {
    const synthesizer = new AiderConfigSynthesizer();
    const args = synthesizer.synthesizeArgs(sampleContext);
    expect(args).toContain("--yes-always");

    const yaml = synthesizer.generateYamlConfig(sampleContext);
    expect(yaml).toContain("yes-always: true");
  });
});

describe("Aider Output Parser", () => {
  it("extracts commit SHA from standard Aider stdout", () => {
    const processResult: AiderProcessResult = {
      stdout: "Applied edit to src/foo.ts\nCommit 7a8b9c0d1e2f3a4b5c6d7e8f901234567890abcd: feat: update code\n",
      stderr: "",
      exitCode: 0,
      durationMs: 1200,
    };

    const parsed = parseAiderOutput(processResult, ["src/foo.ts"]);
    expect(parsed.success).toBe(true);
    expect(parsed.commitHash).toBe("7a8b9c0d1e2f3a4b5c6d7e8f901234567890abcd");
    expect(parsed.filesModified).toContain("src/foo.ts");
    expect(parsed.errorMessage).toBeUndefined();
  });

  it("extracts commit SHA from git bracket format", () => {
    const processResult: AiderProcessResult = {
      stdout: "[main 44db3b233aa6e5fa29cf9e8378b16579b4640f99] feat: implement engine\n 1 file changed\n",
      stderr: "",
      exitCode: 0,
      durationMs: 800,
    };

    const parsed = parseAiderOutput(processResult);
    expect(parsed.success).toBe(true);
    expect(parsed.commitHash).toBe("44db3b233aa6e5fa29cf9e8378b16579b4640f99");
  });

  it("extracts unified diff patch from output", () => {
    const diffSample = "diff --git a/file.ts b/file.ts\n--- a/file.ts\n+++ b/file.ts\n@@ -1 +1 @@\n-old\n+new";
    const processResult: AiderProcessResult = {
      stdout: `Some greeting\n${diffSample}\nCommit 1234567890abcdef1234567890abcdef12345678`,
      stderr: "",
      exitCode: 0,
      durationMs: 900,
    };

    const parsed = parseAiderOutput(processResult, ["file.ts"]);
    expect(parsed.diffPatch).toContain("diff --git a/file.ts b/file.ts");
  });

  it("detects errors when exitCode != 0 or error patterns appear", () => {
    const processResult: AiderProcessResult = {
      stdout: "Attempting to contact provider...",
      stderr: "RateLimitError: 429 Too Many Requests from openrouter",
      exitCode: 1,
      durationMs: 400,
    };

    const parsed = parseAiderOutput(processResult);
    expect(parsed.success).toBe(false);
    expect(parsed.errorMessage).toContain("RateLimitError");
  });

  it("extracts ExecutionArtifact objects from process logs and diffs", () => {
    const processResult: AiderProcessResult = {
      stdout: "diff --git a/f.ts b/f.ts\n+added",
      stderr: "minor warning log",
      exitCode: 0,
      durationMs: 650,
    };

    const parsed = parseAiderOutput(processResult, ["f.ts"]);
    const artifacts = extractExecutionArtifacts(processResult, parsed);

    expect(artifacts.length).toBe(3); // stdout, stderr, diff
    expect(artifacts.find((a) => a.name === "aider-stdout.log")).toBeDefined();
    expect(artifacts.find((a) => a.name === "aider-stderr.log")).toBeDefined();
    expect(artifacts.find((a) => a.name === "changes.diff")).toBeDefined();
  });

  it("class wrapper delegates methods correctly", () => {
    const parser = new AiderOutputParser();
    const result: AiderProcessResult = {
      stdout: "Commit 1111222233334444555566667777888899990000",
      stderr: "",
      exitCode: 0,
      durationMs: 500,
    };

    const parsed = parser.parse(result);
    expect(parsed.commitHash).toBe("1111222233334444555566667777888899990000");

    const artifacts = parser.extractArtifacts(result, parsed);
    expect(artifacts).toHaveLength(1);
  });
});
