#!/usr/bin/env bash
# Focused test for scripts/lib/deploy-reexec.sh.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REEXEC_LIB="${ROOT_DIR}/scripts/lib/deploy-reexec.sh"
TEST_DIR="$(mktemp -d "${TMPDIR:-/tmp}/ecm-deploy-reexec.XXXXXX")"

cleanup() {
    rm -rf "$TEST_DIR"
}
trap cleanup EXIT

fail() {
    printf 'FAIL: %s\n' "$1" >&2
    exit 1
}

git -C "$TEST_DIR" init -q

cat > "$TEST_DIR/deploy.sh" <<'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail

: "${REEXEC_LIB:?}"
: "${TEST_DIR:?}"

source "$REEXEC_LIB"
ui_warning() {
    printf '%s\n' "$*" >> "$TEST_DIR/warnings"
}

count=0
[[ -f "$TEST_DIR/runs" ]] && count="$(cat "$TEST_DIR/runs")"
count=$((count + 1))
printf '%s\n' "$count" > "$TEST_DIR/runs"

printf '%s\n' "${ECM_DEPLOY_REEXECUTED:-0}" > "$TEST_DIR/run-${count}.reexec"
printf '%s\0' "$@" > "$TEST_DIR/run-${count}.args"

if [[ "$count" -eq 1 ]]; then
    # Simulate git pull replacing the canonical deploy script while this copy runs.
    before_hash="$(deploy_script_hash "$TEST_DIR/deploy.sh")"
    cp "$TEST_DIR/deploy-v2.sh" "$TEST_DIR/deploy.sh"
    self_path="$TEST_DIR/deploy.sh"
else
    before_hash="$(deploy_script_hash "$0")"
    self_path="$0"
fi

deploy_maybe_reexec_after_pull \
    "$before_hash" "$self_path" "${ECM_DEPLOY_REEXECUTED:-0}" "$@"
SCRIPT

cp "$TEST_DIR/deploy.sh" "$TEST_DIR/deploy-run.sh"

# v2 differs only by a comment, so the updated script has a new blob hash but
# remains behaviorally identical.
{
    printf '%s\n' '#!/usr/bin/env bash'
    printf '%s\n' '# v2'
    sed '1d' "$TEST_DIR/deploy.sh"
} > "$TEST_DIR/deploy-v2.sh"

chmod +x "$TEST_DIR/deploy.sh" "$TEST_DIR/deploy-run.sh" "$TEST_DIR/deploy-v2.sh"

printf '%s\0' stag deploy --no-backup 'arg with spaces' > "$TEST_DIR/expected.args"

TEST_DIR="$TEST_DIR" REEXEC_LIB="$REEXEC_LIB" \
    "$TEST_DIR/deploy-run.sh" stag deploy --no-backup 'arg with spaces'

[[ -f "$TEST_DIR/runs" ]] || fail 'deploy script did not run'
[[ "$(cat "$TEST_DIR/runs")" == '2' ]] || fail 'expected exactly two runs (one re-exec, no loop)'

for run in 1 2; do
    cmp -s "$TEST_DIR/expected.args" "$TEST_DIR/run-${run}.args" \
        || fail "run ${run} did not receive the original arguments"
done

[[ "$(cat "$TEST_DIR/run-1.reexec")" == '0' ]] || fail 'first run unexpectedly had the re-exec marker'
[[ "$(cat "$TEST_DIR/run-2.reexec")" == '1' ]] || fail 'second run did not have the re-exec marker'
[[ -f "$TEST_DIR/warnings" ]] || fail 're-exec warning was not emitted'
[[ "$(wc -l < "$TEST_DIR/warnings" | tr -d ' ')" == '1' ]] || fail 'expected exactly one re-exec warning'

printf 'PASS: deploy re-exec ran exactly once with the original arguments\n'
