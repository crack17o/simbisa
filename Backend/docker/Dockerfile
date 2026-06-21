FROM python:3.12-slim

RUN groupadd -r simbisa && useradd -r -g simbisa simbisa

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    default-libmysqlclient-dev build-essential pkg-config curl && \
    rm -rf /var/lib/apt/lists/*

COPY requirements/ requirements/
ARG REQUIREMENTS=development.txt
RUN pip install --no-cache-dir -r requirements/${REQUIREMENTS}

COPY . .

RUN mkdir -p logs media staticfiles && chown -R simbisa:simbisa /app

USER simbisa

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s \
    CMD curl -f http://localhost:8000/health/ || exit 1

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]
