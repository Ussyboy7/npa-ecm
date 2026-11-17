#!/usr/bin/env bash
# Helpers for reloading a deploy script after it changes during git pull.

deploy_script_hash() {
    local script_path="$1"
    git hash-object "$script_path" 2>/dev/null || true
}

# Usage: deploy_maybe_reexec_after_pull <before-hash> <script-path> <already-reexecuted> [original args...]
deploy_maybe_reexec_after_pull() {
    [[ $# -ge 3 ]] || return 0

    local before_hash="$1"
    local script_path="$2"
    local already_reexecuted="$3"
    shift 3

    [[ "$already_reexecuted" != "1" ]] || return 0
    [[ -n "$before_hash" ]] || return 0

    local after_hash
    after_hash="$(deploy_script_hash "$script_path")"
    [[ -n "$after_hash" && "$before_hash" != "$after_hash" ]] || return 0

    ui_warning "Deploy script changed during pull; re-executing the new version."
    exec env ECM_DEPLOY_REEXECUTED=1 "$script_path" "$@"
}