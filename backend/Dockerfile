FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /tmp/requirements.txt
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r /tmp/requirements.txt

COPY . .

# Use Daphne for ASGI support (WebSockets + HTTP)
# Daphne can handle both HTTP and WebSocket connections
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "ecm_backend.asgi:application"]

