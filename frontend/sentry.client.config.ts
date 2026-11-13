import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || "";

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    // Tracing: capture 100% of user interactions & transactions
    tracesSampleRate: 1.0,
    // Session Replays: record video-like session of every click & failure
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
  });
  console.log("[J.A.R.V.I.S. Tracing] Sentry Full-Stack Telemetry & Click Analyzer Active.");
}

