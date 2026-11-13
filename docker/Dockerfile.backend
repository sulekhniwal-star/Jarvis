# Project Jarvis — Cloud Control Plane Dockerfile (for Render, Railway, Fly.io)
# Hardened multi-stage build with non-root security execution

FROM python:3.12-slim as builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend definition, source files, and ensure README exists for hatchling
COPY backend/pyproject.toml ./pyproject.toml
COPY backend/app ./app
RUN touch README.md

RUN pip install --upgrade pip && \
    pip install .

# Production runtime stage
FROM python:3.12-slim as runner

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=10000 \
    PYTHONPATH=/app/backend:/app

# Install runtime libraries only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy installed wheels and dependencies from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Create unprivileged application user and data directory
RUN groupadd -g 1001 jarvis && \
    useradd -u 1001 -g jarvis -s /bin/bash -m jarvis && \
    mkdir -p /app/data /app/backend /tmp/jarvis_data && \
    chmod -R 777 /app/data /tmp/jarvis_data && \
    chown -R jarvis:jarvis /app

# Copy application code into container
COPY --chown=jarvis:jarvis backend /app/backend
COPY --chown=jarvis:jarvis backend/app /app/app

USER jarvis

EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-10000}/api/v1/health/live || exit 1

CMD ["python", "-m", "app.cloud_entrypoint"]
