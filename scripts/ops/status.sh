#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/stack-utils.sh
source "${SCRIPT_DIR}/../lib/stack-utils.sh"
# shellcheck source=../lib/ui.sh
source "${SCRIPT_DIR}/../lib/ui.sh"

if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <local|stag|prod>" >&2
    exit 1
fi

stack_init_env "$1"

ui_header "ECM ${STACK_ENVIRONMENT_TITLE} Status — $(date)"

echo
echo "Services:"
stack_compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

echo
echo "Health:"
if curl -s -f --max-time 5 "$STACK_HEALTH_URL" >/dev/null 2>&1; then
    ui_success "Backend: $STACK_HEALTH_URL"
else
    ui_error "Backend: $STACK_HEALTH_URL"
fi
if [[ -n "$STACK_FRONTEND_URL" ]]; then
    if curl -s -f --max-time 5 "$STACK_FRONTEND_URL" >/dev/null 2>&1; then
        ui_success "Frontend: $STACK_FRONTEND_URL"
    else
        ui_warning "Frontend: $STACK_FRONTEND_URL"
    fi
fi
