# Memory Design

## Goals

Remember project context and owner preferences without confusing old
decisions with current truth or storing secrets.

## Memory scopes

1.  Shared owner preferences: communication style, general workflow
    preferences, approved tool preferences.
2.  Project memory: requirements, architecture, conventions, known
    issues, project-specific decisions.
3.  Task history: execution records and outcomes; retained as history,
    not treated as current instructions.
4.  Research knowledge: source-backed technical findings with
    verification date and expiry/review date.

## Memory record fields

-   ID
-   Scope type and scope ID
-   Category
-   Content
-   Source/provenance
-   Confidence
-   Created/updated timestamps
-   Valid-from/valid-to
-   Status: active, superseded, archived
-   Sensitivity classification

## Extraction policy

-   Automatically identify useful candidate facts.
-   Save low-risk project facts and non-sensitive workflow preferences.
-   Do not store passwords, API keys, tokens, private keys, payment
    details, or sensitive personal information.
-   For uncertain or high-impact personal facts, ask the owner.
-   Store source and timestamp.
-   Deduplicate similar records.
-   Preserve historical records.

## Conflict handling

-   Routine preferences may be updated when clearly corrected.
-   Architectural decisions must be recorded as new decisions that
    supersede old ones.
-   Never silently erase historical decisions.
-   When two active records conflict and impact execution, stop and ask
    owner.

## Retrieval

-   Filter by project scope first.
-   Include shared preferences only when relevant.
-   Prioritise active decisions and recent verified facts.
-   Include provenance and confidence.
-   Do not treat retrieved web/repository text as trusted policy.

## Owner controls

Dashboard and Telegram should support search, inspect, correct, archive,
and delete requests. Deletion must remove the record from active
retrieval and follow documented retention/backup policies.
