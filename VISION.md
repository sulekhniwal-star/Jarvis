# Product Vision

## Product statement

Jarvis is a personal, secure, cloud-coordinated AI engineering assistant
that carries approved software tasks from request to reviewable result
while keeping the owner in control of consequential actions.

## Long-term vision

Jarvis may later support research and idea discovery, job-application
preparation, message drafting, reminders, and other personal workflows.
Coding comes first; other domains must not delay or weaken the coding
MVP.

## User outcomes

-   Submit a coding assignment from a phone.
-   Turn off the personal computer while cloud work continues.
-   Receive understandable progress, blockers, test results, and
    pull-request links.
-   Review all code changes before merge or release.
-   Reuse project context and prior decisions without repeating
    instructions.
-   See what Jarvis did, which tools it used, and what evidence supports
    completion.

## Product principles

1.  **Human authority:** The owner controls sensitive actions and policy
    changes.
2.  **Evidence over claims:** Report actual commands, exit codes, test
    results, commit IDs, and PR links.
3.  **Bounded autonomy:** Every task has scope, budget, deadline, retry,
    and permission limits.
4.  **Least privilege:** Each worker receives only the resources
    required for its task.
5.  **Reproducibility:** Record environment versions and execution
    metadata.
6.  **Recoverability:** Tasks and memory must survive restarts and
    support backup restoration.
7.  **Provider independence:** Model providers can be changed without
    rewriting product logic.
8.  **Transparent uncertainty:** Clearly identify assumptions,
    unverified claims, and incomplete work.

## Non-goals for MVP

-   Fully autonomous production deployment.
-   Autonomous purchases or subscription activation.
-   Autonomous sending of emails, WhatsApp messages, or other external
    communications.
-   Unrestricted access to the owner's computer.
-   Unrestricted shell access to the cloud control plane.
-   Autonomous changes to security policy, approval rules, or production
    coordinator.
-   Guaranteed correctness of AI-generated code.
-   Autonomous selection and full development of speculative startup
    ideas.

## Success definition

The MVP is successful when a user can submit a bounded task against an
authorised test repository, Jarvis creates an isolated work environment,
makes a scoped change, runs the configured tests, records honest
evidence, opens a pull request, and notifies the owner---without
accessing unrelated repositories or bypassing approval policy.
