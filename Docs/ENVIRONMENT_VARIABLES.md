# Environment Variables Template

This file documents variable names only. Never put real secrets in this
file or commit a populated `.env`.

  -----------------------------------------------------------------------------------
  Variable                    Purpose                         Secret?
  --------------------------- ------------------------------- -----------------------
  APP_ENV                     local/test/staging/production   No

  APP_BASE_URL                Public application URL          No

  DATABASE_URL                PostgreSQL connection string    Yes

  AUTH_SECRET                 Session/token signing secret    Yes

  MASTER_ENCRYPTION_KEY       Fernet encryption master key    Yes

  TELEGRAM_BOT_TOKEN          Telegram bot credential         Yes

  TELEGRAM_AUTHORIZED_USER_ID Single allowed numeric user ID  Treat as private config

  GITHUB_APP_ID               GitHub App identifier           No

  GITHUB_PRIVATE_KEY_REF      Secret manager reference for    No
                              private key                     

  GITHUB_WEBHOOK_SECRET_REF   Secret manager reference        No

  GEMINI_API_KEY_REF          Optional secret manager         No
                              reference                       

  OPENROUTER_API_KEY          OpenRouter API key              Yes

  DEFAULT_AI_PROVIDER         Default AI provider (openrouter) No

  DEFAULT_MODEL_NAME          Default model (openrouter/auto) No

  AI_PAID_CALLS_ENABLED       Must default to false           No

  WORKER_MAX_SECONDS          Maximum execution time          No

  WORKER_MAX_MEMORY_MB        Worker memory cap               No

  WORKER_MAX_CPU              Worker CPU quota                No

  TASK_MAX_RETRIES            Bounded retry count             No

  LOG_LEVEL                   Logging verbosity               No
  -----------------------------------------------------------------------------------

Rules: - Use secret manager or protected deployment secrets. - Redact
credentials from logs and error messages. - Validate required variables
at startup. - Fail closed if auth or policy configuration is missing. -
`.env`, private keys, tokens, and credential files must be gitignored.
