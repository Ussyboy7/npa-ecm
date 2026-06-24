#!/usr/bin/env bash
# Shared UI helpers — colours and log wrappers.

if [[ "${ECM_UI_SOURCED:-0}" = "1" ]]; then
    return 0 2>/dev/null || true
fi
ECM_UI_SOURCED=1

if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
    UI_RED='\033[0;31m'
    UI_GREEN='\033[0;32m'
    UI_YELLOW='\033[1;33m'
    UI_BLUE='\033[0;34m'
    UI_CYAN='\033[0;36m'
    UI_BOLD='\033[1m'
    UI_NC='\033[0m'
else
    UI_RED='' UI_GREEN='' UI_YELLOW='' UI_BLUE='' UI_CYAN='' UI_BOLD='' UI_NC=''
fi

ui_header() {
    printf '%b%s%b\n' "$UI_BLUE" "================================================================================" "$UI_NC"
    printf '%b%s%b\n' "$UI_BLUE" "$1" "$UI_NC"
    printf '%b%s%b\n' "$UI_BLUE" "================================================================================" "$UI_NC"
}

ui_subheader() {
    printf '\n%b%s%b\n' "$UI_CYAN" "$1" "$UI_NC"
}

ui_log() {
    local logfile="$1"; shift
    local msg="$*"
    local line
    line="$(date '+%Y-%m-%d %H:%M:%S') - ${msg}"
    if [[ -n "$logfile" ]]; then
        mkdir -p "$(dirname "$logfile")" 2>/dev/null || true
        printf '%s\n' "$line" | tee -a "$logfile"
    else
        printf '%s\n' "$line"
    fi
}

ui_success() { printf '%b✓ %s%b\n' "$UI_GREEN" "$1" "$UI_NC"; }
ui_error()   { printf '%b✗ %s%b\n' "$UI_RED"   "$1" "$UI_NC" >&2; }
ui_warning() { printf '%b! %s%b\n' "$UI_YELLOW" "$1" "$UI_NC"; }
ui_info()    { printf '%bi %s%b\n' "$UI_CYAN"  "$1" "$UI_NC"; }
ui_step()    { printf '%b› %s%b\n' "$UI_BLUE"  "$1" "$UI_NC"; }
