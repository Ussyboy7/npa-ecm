#!/usr/bin/env bash
# Staging diagnostics — use on the staging server.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${SCRIPT_DIR}/../ops/env-manager.sh" stag diagnostics "$@"
