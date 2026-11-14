# ADR-004: Isolated Ephemeral GitHub Actions Compute with Aider

**Status:** Accepted  
**Date:** 2026-11-14  
**Deciders:** DevSecOps Engineer, Staff Backend Engineer  

---

## Context and Problem Statement
Autonomous coding agents execute arbitrary code, modify project dependencies, and run automated test suites. Executing generated code on a persistent self-hosted server or on the developer's primary machine introduces severe security risks: a malicious or hallucinated prompt could access environment secrets, establish reverse shells, or compromise host infrastructure.

## Decision Drivers
- Physical and cryptographic isolation between unprivileged code execution and master secrets.
- Ephemeral execution environments destroyed immediately upon job completion.
- Zero idle hosting cost (leveraging GitHub Actions runner minutes).
- Git-native diff generation and multi-file editing support.

## Considered Options
1. Persistent self-hosted VPS runner.
2. Local Docker container running on the developer's laptop.
3. Ephemeral GitHub-hosted Actions runners (`ubuntu-latest`) dispatching Docker sandboxes running Aider CLI.

## Decision Outcome
Chosen option: **Ephemeral GitHub-hosted Actions runners dispatching Docker sandboxes running Aider CLI**.

### Positive Consequences
- **Total Ephemerality:** Every task executes on a freshly provisioned virtual machine discarded immediately after the run.
- **Zero Master Secrets Exposure:** Master Supabase, GitHub App, and OpenRouter keys are never provided to the runner. The runner receives only a temporary, single-repo token (`ghs_...`, 60 min TTL).
- **Aider Capabilities:** Headless non-interactive execution (`--message`, `--yes-always`) provides git-aware editing with syntax-aware diffs.

### Negative Consequences / Trade-offs
- Cold-start latency (1-2 minutes) for GitHub Actions runner provisioning and Docker image pull.
