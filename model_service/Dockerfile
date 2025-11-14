FROM python:3.11-slim

# Avoid interactive prompts and enable unbuffered output
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install runtime deps (curl for health/debug), and clean up apt cache
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (leverage layer caching)
COPY model_service/requirements.txt /app/requirements.txt
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# Copy application code (including models directory)
COPY model_service /app

# Expose service port
EXPOSE 8000

# Healthcheck hits /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8000/health || exit 1

# Start FastAPI app with Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]


