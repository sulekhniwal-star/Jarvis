# Agent Design

## Principle

Use a small number of clearly scoped agents and deterministic services.
Avoid creating a large multi-agent swarm before a single-agent workflow
is reliable.

## MVP roles

### 1. Planner

Input: user task, project metadata, approved memory. Output: structured
plan, assumptions, affected areas, acceptance criteria, risk level.
Cannot execute shell commands or approve actions.

### 2. Researcher

Input: plan and research scope. Output: source-backed findings, version
compatibility, uncertainties. External content is untrusted. Cannot
access secrets or privileged tools.

### 3. Coding worker

Input: approved task plan, repository snapshot, scoped branch
capability. Output: patch, changed files, command log, test evidence,
summary. Runs only inside isolated execution boundary.

### 4. Reviewer

Input: diff, plan, test evidence. Output: review findings, risk
classification, missing tests. Must not be the only reviewer for
security-sensitive changes.

### 5. Memory extractor

Input: task outcomes and approved project facts. Output: candidate
memory records with provenance and confidence. Cannot store credentials
or sensitive data.

## Deterministic services (not agents)

-   Authentication
-   Policy/permission checks
-   Approval service
-   Secret broker
-   Worker provisioner
-   GitHub credential broker
-   Audit logger
-   Cost gate
-   Kill switch

## Workflow

Intake -\> plan -\> policy check -\> optional approval -\> provision -\>
execute -\> test -\> review -\> artifact validation -\> PR -\> notify
-\> memory extraction.

## Agent output

Use structured schemas. Reject malformed or unsupported tool requests.
Do not trust natural-language claims of completion; require tool
evidence.

## Retry policy

Configure maximum attempts, total wall-clock time, token/request budget,
and command count per task. Stop on repeated identical failures or
policy violations. Ask owner when blocked.

## Context management

Pass only relevant project documentation and files. Summarise long
execution history with references to durable artifacts. Keep external
content labelled as untrusted.
