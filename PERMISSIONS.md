# Permission Matrix

## Roles

-   Owner: human authority.
-   Control-plane service: executes deterministic policy and workflow
    logic.
-   Planner/research agent: proposes plans and findings.
-   Coding worker: edits selected repository in isolated workspace.
-   Reviewer agent: reviews diffs and test evidence.
-   Notification service: sends permitted Jarvis notifications to owner.
-   GitHub integration: uses scoped GitHub App installation token.

## Capability matrix

  -----------------------------------------------------------------------------
  Action                     Agent/worker      Control plane     Owner approval
  -------------------- ------------------ ------------------ ------------------
  Read selected repo               Scoped                Yes       Initial repo
                                                                  authorisation

  Edit task workspace       Coding worker  No direct editing         Task scope
                                                                    approval as
                                                                     configured

  Create branch/commit       Request only GitHub integration     Pre-authorised
                                                                  bounded scope

  Open PR                    Request only GitHub integration             May be
                                                             pre-authorised for
                                                                 selected repos

  Merge PR                             No No automatic merge           Required
                                                      in MVP 

  Deploy production                    No                 No           Required

  Send external                        No                 No           Required
  messages                                                   

  Purchase/activate                    No                 No           Required
  paid service                                               

  Change account                       No                 No           Required
  security                                                   

  Delete important                     No   Guarded workflow           Required
  data                                                  only 

  Change                               No             Policy           Required
  permissions/policy                          administration 

  Read secrets                         No Secret broker only    Never expose to
                                                               model by default

  Emergency stop              Can request   Can execute stop  Owner can trigger
  -----------------------------------------------------------------------------

## Rules

-   Deny by default.
-   Grant access per project and per task.
-   Expire capabilities automatically.
-   Do not give agents owner credentials.
-   Worker cannot call approval endpoints.
-   Model output cannot change role or permission assignments.
-   Any new tool requires documented purpose, schema, permissions, and
    tests.
