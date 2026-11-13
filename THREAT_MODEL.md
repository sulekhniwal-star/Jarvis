# Threat Model

## Assets

-   Owner identity and sessions
-   GitHub repositories and organisation
-   AI provider credentials
-   Telegram bot token
-   Database and memory
-   Worker environments
-   Approval authority
-   Source code and artifacts
-   Cloud account and billing

## Threat actors

-   Malicious repository contributor
-   Malicious issue/PR/document author
-   Compromised dependency or install script
-   Phishing or stolen session
-   Malicious or compromised model/tool provider
-   Accidental owner misconfiguration
-   Compromised worker

## Threat scenarios and mitigations

  -----------------------------------------------------------------------
  Threat                  Example                 Mitigation
  ----------------------- ----------------------- -----------------------
  Prompt injection        README tells agent to   Treat as untrusted; no
                          exfiltrate secrets      secrets in worker; tool
                                                  policy

  Credential theft        Token printed in build  Short-lived scoped
                          logs                    token; redaction;
                                                  secret scanning

  Sandbox escape          Malicious build script  Disposable runner/VM;
                          attacks host            no privileged mode;
                                                  patching

  Repository overreach    Worker reads unrelated  Installation restricted
                          private repos           to selected repository

  Approval spoofing       Agent fabricates        Authenticated owner
                          approval                session; signed
                                                  server-side state

  Replay                  Old approval reused     Expiry, nonce, payload
                                                  hash, one-time state
                                                  transition

  Cost abuse              Agent loops API calls   Paid calls disabled;
                                                  hard quotas and circuit
                                                  breaker

  Data exfiltration       Worker sends source to  Egress controls;
                          arbitrary endpoint      provider allowlist; no
                                                  secrets

  Destructive command     `rm` targets mounted    Ephemeral workspace;
                          data                    command policy; no host
                                                  mounts

  Supply-chain attack     Dependency install      Lockfiles, scanning,
                          executes malicious code isolated build,
                                                  restricted network

  Memory poisoning        External content saved  Provenance, sensitivity
                          as trusted preference   labels, review and
                                                  scope

  Account takeover        Stolen dashboard        MFA, session expiry,
                          session                 revocation, audit
  -----------------------------------------------------------------------

## Risk assessment

For each threat, record likelihood, impact, residual risk, owner, and
verification test in the project risk register. Do not mark a threat
mitigated solely because a prompt instructs the model to behave safely.

## Security test cases

-   External document asks for system prompt or secrets.
-   Repository script attempts to read environment variables.
-   Worker attempts access to metadata service or internal network.
-   Expired/replayed approval is submitted.
-   Telegram message from unauthorised user attempts a task.
-   Worker attempts to access a second repository.
-   Agent tries to edit policy files.
-   Repeated model calls exceed task budget.
