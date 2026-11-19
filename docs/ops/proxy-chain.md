# Proxy chain and `THROTTLE_NUM_PROXIES`

DRF derives the throttle key for anonymous requests from `X-Forwarded-For`
(`NUM_PROXIES`). The value must match the real chain exactly.

## What is confirmed in this repository

```
client ──▶ [edge TLS terminator?] ──▶ nginx (compose) ──▶ Daphne (backend)
                                        │
                                        └──▶ frontend replicas
```

- `docker-compose.prod.yml` and `docker-compose.stag.yml` publish only nginx
  (`80`/`443` and `4646` respectively). `backend` and `frontend` use `expose`,
  so they are reachable only on the compose network.
- Both nginx configs forward with `X-Forwarded-For $proxy_add_x_forwarded_for`,
  which **appends** the peer address and preserves any client-supplied entries.
- Staging is addressed directly on `http://172.16.0.46:4646`, so the chain is
  confirmed to be one hop: `client → nginx → Daphne`.

## What is not confirmed

- `nginx/prod.conf` has no `listen 443` or TLS configuration, yet production is
  served at `https://ecm.nigerianports.gov.ng` and `SECURE_SSL_REDIRECT`
  defaults to `true`. That implies a TLS-terminating device in front of nginx
  (hardware/virtual load balancer, WAF, or CDN), but its type and hop count are
  not described anywhere in this repository.
- Nginx sends `X-Forwarded-Proto $scheme` (`http`), so a TLS terminator in front
  of it must also be the component that makes HTTPS work end to end. Confirm
  this while checking the chain.

Until that edge is confirmed, production cannot honestly be described as
one hop.

## Choosing the value

| Real chain | `THROTTLE_NUM_PROXIES` |
|---|---|
| client → nginx → Django | `1` |
| client → LB/CDN → nginx → Django | `2` |
| client → CDN → LB → nginx → Django | `3` |

Failure modes:

- **Too low** (e.g. `1` when an LB sits in front): every client is keyed on the
  load balancer address, so one shared bucket exhausts and all visitors get
  `429` together.
- **Too high** (e.g. `2` when nginx is the only proxy): DRF reads a
  client-supplied `X-Forwarded-For` entry, so callers can rotate their key and
  bypass the limit.

Both are real outages of the protection, so set the value from evidence rather
than a guess.

## Current values

- Staging: `THROTTLE_NUM_PROXIES: "1"` (confirmed single hop).
- Production: `docker-compose.prod.yml` **requires** the variable and refuses
  to start without it, with a message pointing here. This is deliberate: a
  guessed value either buckets every visitor or lets callers spoof
  `X-Forwarded-For`, and neither failure is visible from the app. Set it in the
  deployment shell environment or the project-root `.env` used by compose
  interpolation (not `backend/env/prod.env`, which is passed to containers but
  is not read by compose interpolation).
- Non-local environments that leave the variable unset emit Django system check
  `ecm.W001`, so the implicit default is visible in `manage.py check` and
  deploy logs.

## How to confirm the hop count

1. Identify every device that terminates TLS or proxies HTTP before nginx
   (network team, cloud console, or LB configuration).
2. Compare the client address with what Django receives for one request. From
   the server, temporarily include `$http_x_forwarded_for` and `$remote_addr`
   in the nginx log format, make one external request, and read the line:
   each trusted proxy adds one entry to `X-Forwarded-For`.
3. A spoof check: send the same request twice with a custom
   `X-Forwarded-For: 203.0.113.9` header. If the throttle counter increments for
   both, the chain is at least long enough; if a different forged address is
   honoured as a new bucket, `THROTTLE_NUM_PROXIES` is set too high.

After changing it, restart the backend container — `daphne` does not reload
settings — and confirm `manage.py check` no longer emits `ecm.W001`.
