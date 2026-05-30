#!/bin/bash
# db-restore.sh — Restore database from a backup
# Usage: ./scripts/db-restore.sh <backup-timestamp>
#   or:  ./scripts/db-restore.sh latest
#
# WARNING: This will OVERWRITE your current database!
# Only run this if a deploy went wrong and you need to revert.

set -euo pipefail

BACKUP_DIR="supabase/backups"
TIMESTAMP="${1:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ -z "${TIMESTAMP}" ]; then
  echo -e "${RED}Error: Missing backup timestamp${NC}"
  echo -e "Usage: ./scripts/db-restore.sh <timestamp>"
  echo -e "       ./scripts/db-restore.sh latest"
  echo ""
  echo -e "${BLUE}Available backups:${NC}"
  ls -lt "${BACKUP_DIR}"/*.sql 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}' || echo "  No backups found"
  exit 1
fi

# Resolve "latest" to actual filename
if [ "${TIMESTAMP}" == "latest" ]; then
  BACKUP_FILE=$(ls -t "${BACKUP_DIR}"/*.sql 2>/dev/null | head -1)
  if [ -z "${BACKUP_FILE}" ]; then
    echo -e "${RED}Error: No backups found in ${BACKUP_DIR}/${NC}"
    exit 1
  fi
else
  BACKUP_FILE="${BACKUP_DIR}/backup-${TIMESTAMP}.sql"
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo -e "${RED}Error: Backup file not found: ${BACKUP_FILE}${NC}"
  echo ""
  echo -e "${BLUE}Available backups:${NC}"
  ls -lt "${BACKUP_DIR}"/*.sql 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}' || echo "  No backups found"
  exit 1
fi

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  ⚠️  WARNING: DATABASE RESTORE${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "This will ${RED}DELETE ALL CURRENT DATA${NC} and restore from:"
echo -e "  ${YELLOW}${BACKUP_FILE}${NC}"
echo ""
echo -e "${RED}This action cannot be undone!${NC}"
echo ""

# Double confirmation
read -p "Type 'RESTORE' to confirm: " CONFIRM
if [ "${CONFIRM}" != "RESTORE" ]; then
  echo -e "${YELLOW}Cancelled.${NC}"
  exit 0
fi

echo ""
echo -e "${BLUE}Restoring database...${NC}"

# Load env
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Extract project ref
PROJECT_REF=$(echo "${VITE_SUPABASE_URL:-}" | sed -n 's|https://\([a-zA-Z0-9_-]*\)\.supabase\.co|\1|p')

if [ -z "${PROJECT_REF}" ]; then
  echo -e "${RED}Error: VITE_SUPABASE_URL not set in .env${NC}"
  exit 1
fi

if ! command -v psql &> /dev/null; then
  echo -e "${RED}Error: psql not found. Install PostgreSQL client:${NC}"
  echo -e "  macOS: brew install libpq"
  echo -e "  Ubuntu: sudo apt install postgresql-client"
  exit 1
fi

# Get DB password via supabase CLI or prompt
DB_URL=$(supabase status --output json 2>/dev/null | grep -o '"database_url": "[^"]*"' | cut -d'"' -f4 || true)

if [ -z "${DB_URL}" ]; then
  echo -e "${YELLOW}Could not auto-detect DB URL. Please enter your Supabase database password:${NC}"
  read -s DB_PASSWORD
  DB_URL="postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"
fi

echo -e "${BLUE}Dropping and recreating schema...${NC}"
psql "${DB_URL}" -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;" || {
  echo -e "${RED}Failed to reset schema. Check your connection.${NC}"
  exit 1
}

echo -e "${BLUE}Restoring from backup...${NC}"
psql "${DB_URL}" < "${BACKUP_FILE}"

echo -e "${GREEN}✓ Database restored successfully from ${BACKUP_FILE}${NC}"
