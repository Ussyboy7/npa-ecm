#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/stack-utils.sh"

usage() {
    cat <<'USAGE'
Usage: scripts/backup-db.sh <environment> [options]

Options:
  --output-dir <path>   Directory to store backups (default: ./backups/<env>)
  --filename <name>     Override backup file name
USAGE
}

if [[ $# -lt 1 ]]; then
    usage
    exit 1
fi

ENVIRONMENT="$1"
shift || true

OUTPUT_DIR=""
CUSTOM_NAME=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --output-dir)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --filename)
            CUSTOM_NAME="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1" >&2
            usage
            exit 1
            ;;
    esac
done

stack_init_env "$ENVIRONMENT"
stack_load_env_vars

DB_NAME="${DB_NAME:-npa_ecm}"
DB_USER="${DB_USER:-ecmadmin}"

if [[ -z "$OUTPUT_DIR" ]]; then
    OUTPUT_DIR="${PROJECT_ROOT}/backups/${STACK_ENVIRONMENT}"
fi
mkdir -p "$OUTPUT_DIR"

TIMESTAMP="$(stack_timestamp)"
FILENAME="${CUSTOM_NAME:-db-${STACK_ENVIRONMENT}-${TIMESTAMP}.sql}"
BACKUP_PATH="${OUTPUT_DIR}/${FILENAME}"

echo "Backing up ${DB_NAME} from ${STACK_ENVIRONMENT} to ${BACKUP_PATH}"
stack_compose exec -T "$STACK_POSTGRES_SERVICE" pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_PATH"
echo "✅ Backup complete"
