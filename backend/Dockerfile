FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        poppler-utils \
        libpango-1.0-0 \
        libpangoft2-1.0-0 \
        libharfbuzz-subset0 \
        libcairo2 \
        libgdk-pixbuf-2.0-0 \
        fonts-dejavu-core \
        tesseract-ocr \
        tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /tmp/requirements.txt
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r /tmp/requirements.txt

COPY . .

# Use Daphne for ASGI support (WebSockets + HTTP)
# Daphne can handle both HTTP and WebSocket connections
CMD ["daphne", "-b", "0.0.0.0", "-p", "8002", "ecm_backend.asgi:application"]

