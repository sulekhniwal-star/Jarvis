"""
Project Jarvis — Request & Click-Action Tracing Middleware (Pure ASGI).
Captures every API request, latency, status code, error stack traces,
and correlates frontend clicks with backend execution via X-Trace-Id.
Integrates with Sentry for end-to-end distributed tracing.
"""

import time
import uuid
import structlog
from app.core.config import settings

logger = structlog.get_logger("jarvis.tracer")

# Initialize Sentry if DSN is provided
if settings.SENTRY_DSN:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.SENTRY_ENVIRONMENT,
            traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
            profiles_sample_rate=1.0,
            integrations=[
                FastApiIntegration(transaction_style="endpoint"),
                SqlalchemyIntegration(),
            ],
            send_default_pii=False,
        )
        logger.info("Sentry APM & Error Tracing initialized", environment=settings.SENTRY_ENVIRONMENT)
    except Exception as e:
        logger.warning(f"Could not initialize Sentry: {e}")


class TraceAndAuditMiddleware:
    """
    Pure ASGI Middleware that correlates every frontend user click / action
    with backend execution, tracking duration, status, and failure traces.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        trace_id = None
        for name, value in scope.get("headers", []):
            if name in (b"x-trace-id", b"x-request-id"):
                trace_id = value.decode("utf-8", errors="ignore")
                break

        if not trace_id:
            trace_id = f"trc_{uuid.uuid4().hex[:12]}"

        start_time = time.perf_counter()
        method = scope.get("method", "GET")
        path = scope.get("path", "/")

        logger.info("ACTION_START", trace_id=trace_id, method=method, path=path)

        response_started = False

        async def send_wrapper(message):
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
                duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
                status_code = message.get("status", 200)

                headers = list(message.get("headers", []))
                headers.append((b"x-trace-id", trace_id.encode("utf-8")))
                headers.append((b"x-response-time-ms", str(duration_ms).encode("utf-8")))
                message["headers"] = headers

                if status_code >= 400:
                    logger.warning(
                        "ACTION_FAILED_HTTP",
                        trace_id=trace_id,
                        method=method,
                        path=path,
                        status_code=status_code,
                        duration_ms=duration_ms,
                    )
                else:
                    logger.info(
                        "ACTION_SUCCESS",
                        trace_id=trace_id,
                        method=method,
                        path=path,
                        status_code=status_code,
                        duration_ms=duration_ms,
                    )

            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.error(
                "ACTION_CRASH",
                trace_id=trace_id,
                method=method,
                path=path,
                error=str(exc),
                duration_ms=duration_ms,
                exc_info=True,
            )
            if settings.SENTRY_DSN:
                try:
                    import sentry_sdk
                    sentry_sdk.set_tag("trace_id", trace_id)
                    sentry_sdk.capture_exception(exc)
                except Exception:
                    pass

            if not response_started:
                import json
                error_body = json.dumps({
                    "detail": f"Internal execution error: {str(exc)}",
                    "trace_id": trace_id,
                    "duration_ms": duration_ms,
                    "status": "error"
                }).encode("utf-8")

                await send({
                    "type": "http.response.start",
                    "status": 500,
                    "headers": [
                        (b"content-type", b"application/json"),
                        (b"access-control-allow-origin", b"*"),
                        (b"access-control-allow-methods", b"*"),
                        (b"access-control-allow-headers", b"*"),
                        (b"x-trace-id", trace_id.encode("utf-8")),
                        (b"x-response-time-ms", str(duration_ms).encode("utf-8")),
                    ],
                })
                await send({
                    "type": "http.response.body",
                    "body": error_body,
                })
            else:
                raise exc
