# Archived scripts

Legacy bare-metal startup scripts were removed in favour of Docker + `env-manager`.

## Use instead

| Old pattern | Replacement |
|-------------|-------------|
| `./scripts/production/start-local.sh` | `scripts/local/env-manager.sh start` |
| `./scripts/production/start-backend-local.sh` | Docker stack above, or `cd backend && daphne -b 0.0.0.0 -p 8002 ecm_backend.asgi:application` |
| `./scripts/production/start-celery-local.sh` | Celery runs in the `celery-worker` compose service |
| `./scripts/production/start-stag.sh` | `scripts/staging/env-manager.sh deploy` (on server) |
| `./scripts/production/test-docker-compose.sh` | `make compose-check` or `scripts/ci/validate-compose.sh` |
| `./scripts/production/collect-static.sh` | `scripts/<env>/env-manager.sh collectstatic` |
| `./scripts/monitoring/check-backend-status.sh` | `scripts/stack/backend-status.sh stag` |
| `./scripts/monitoring/check-staging-services.sh` | `scripts/staging/env-manager.sh diagnostics` |
| `scripts/BACKEND_STARTUP_GUIDE.md` | `scripts/README.md` + `AGENTS.md` |
