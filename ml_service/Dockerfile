FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    MODELS_DIR=/models

# libgomp1: OpenMP runtime required by xgboost and scikit-learn.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Non-root user; /models is the model cache (S3 download target or a mounted volume).
RUN useradd --uid 10001 --no-create-home --shell /usr/sbin/nologin app \
    && mkdir -p /models && chown app:app /models
COPY --chown=app:app app.py .

USER app
EXPOSE 5001
# Long start-period: the 218 MB price model (plus a first-boot S3 download) loads before waitress listens.
HEALTHCHECK --interval=30s --timeout=10s --start-period=180s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5001/health/models', timeout=5)" || exit 1
CMD ["waitress-serve", "--host=0.0.0.0", "--port=5001", "--threads=8", "app:app"]
