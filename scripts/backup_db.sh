#!/bin/bash
# Database backup script for AI Crypto Trader
# Usage: ./backup_db.sh [backup_dir]

set -euo pipefail

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"

# Load environment if .env exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Parse DATABASE_URL
if [ -z "${DATABASE_URL:-}" ]; then
    echo "Error: DATABASE_URL not set"
    exit 1
fi

# Extract components from DATABASE_URL
# Format: postgresql://user:pass@host:port/dbname
DB_URL="${DATABASE_URL#postgresql://}"
DB_USER="${DB_URL%%:*}"
DB_URL="${DB_URL#*:}"
DB_PASS="${DB_URL%%@*}"
DB_URL="${DB_URL#*@}"
DB_HOST="${DB_URL%%:*}"
DB_URL="${DB_URL#*:}"
DB_PORT="${DB_URL%%/*}"
DB_NAME="${DB_URL#*/}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

echo "Starting backup..."
echo "  Database: ${DB_NAME}"
echo "  Host: ${DB_HOST}:${DB_PORT}"
echo "  Output: ${BACKUP_FILE}"

# Perform backup
PGPASSWORD="${DB_PASS}" pg_dump \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --no-owner \
    --no-acl \
    | gzip > "${BACKUP_FILE}"

# Check result
if [ -f "${BACKUP_FILE}" ]; then
    SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "Backup completed successfully!"
    echo "  File: ${BACKUP_FILE}"
    echo "  Size: ${SIZE}"
else
    echo "Error: Backup failed"
    exit 1
fi

# Clean old backups (keep last 7 days)
find "${BACKUP_DIR}" -name "backup_*.sql.gz" -mtime +7 -delete 2>/dev/null || true
echo "Old backups cleaned (keeping last 7 days)"
