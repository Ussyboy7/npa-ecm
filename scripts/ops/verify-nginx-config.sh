#!/usr/bin/env bash
# Make sure the running nginx container serves the config currently in the repo.
#
# nginx/stag.conf and nginx/prod.conf are bind-mounted as single files, so after
# `git pull` replaces the host file the container keeps the old inode and keeps
# serving the pre-pull config — `nginx -s reload` reloads that stale copy.
# Default behaviour: restart the container when it differs (validating the new
# config first), then fail if it still differs. --check reports without acting.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/stack-utils.sh
source "${SCRIPT_DIR}/../lib/stack-utils.sh"

usage() {
    cat <<'USAGE'
Usage: scripts/ops/verify-nginx-config.sh <local|stag|prod> [--check]

Ensures the running nginx container serves the config in the repo.

  (no flag)  restart the container when its config is stale, then verify
  --check    only report; exit 1 when the running config differs from the repo

Exit status is non-zero when the config cannot be proven to match, so this is
safe to use as a gate after `git pull` or in a deploy script.
USAGE
}

if [[ $# -lt 1 ]]; then
    usage >&2
    exit 1
fi

case "${1:-}" in
    -h|--help) usage; exit 0 ;;
esac

ENVIRONMENT="$1"
shift

CHECK_ONLY=false
while [[ $# -gt 0 ]]; do
    case "$1" in
        --check)    CHECK_ONLY=true ;;
        -h|--help)  usage; exit 0 ;;
        *)
            printf 'Unknown option: %s\n\n' "$1" >&2
            usage >&2
            exit 1
            ;;
    esac
    shift
done

stack_init_env "$ENVIRONMENT"

if [[ "$STACK_ENVIRONMENT" == "local" ]]; then
    printf 'The local stack has no nginx container; nothing to verify.\n'
    exit 0
fi

if [[ "$CHECK_ONLY" == true ]]; then
    stack_ensure_nginx_config_current --check
else
    stack_ensure_nginx_config_current
fi
