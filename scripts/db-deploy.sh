#!/bin/bash
# db-deploy.sh — SAFE deploy: backup first, then apply migration
# Usage: ./scripts/db-deploy.sh [migration-file]
#
# If no migration file is given, backs up and shows status.
# If a migration file is given, backs up first, then applies it.
#
# This is the script to run when you want to deploy a DB change.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

MIGRATION_FILE="${1:-}"
MIGRATIONS_DIR="supabase/migrations"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Safe Database Deploy${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 1: Always backup first
echo -e "${CYAN}Step 1/3: Creating backup...${NC}"
./scripts/db-backup.sh || {
  echo -e "${RED}Backup failed. Deploy aborted.${NC}"
  exit 1
}

echo ""

# Step 2: If migration file provided, show diff and confirm
if [ -n "${MIGRATION_FILE}" ]; then
  if [ ! -f "${MIGRATION_FILE}" ]; then
    # Try to find in migrations dir
    FOUND=$(ls -1 "${MIGRATIONS_DIR}"/*"${MIGRATION_FILE}"*.sql 2>/dev/null | grep -v '\.down\.sql$' | head -1)
    if [ -n "${FOUND}" ]; then
      MIGRATION_FILE="${FOUND}"
    else
      echo -e "${RED}Error: Migration file not found: ${MIGRATION_FILE}${NC}"
      exit 1
    fi
  fi

  echo -e "${CYAN}Step 2/3: Migration to apply:${NC}"
  echo -e "  ${YELLOW}$(basename "${MIGRATION_FILE}")${NC}"
  echo ""

  # Show a preview
  echo -e "${CYAN}Preview (first 20 lines):${NC}"
  head -20 "${MIGRATION_FILE}" | sed 's/^/  /'
  echo ""

  # Check for down-migration
  DOWN_FILE="${MIGRATION_FILE%.sql}.down.sql"
  if [ -f "${DOWN_FILE}" ]; then
    echo -e "  ${GREEN}✓ Down-migration exists:${NC} $(basename "${DOWN_FILE}")"
  else
    echo -e "  ${YELLOW}⚠ No down-migration found.${NC}"
    echo -e "    If something goes wrong, you'll need to restore from backup."
  fi
  echo ""

  # Confirm
  read -p "Apply this migration? (yes/no): " CONFIRM
  if [ "${CONFIRM}" != "yes" ]; then
    echo -e "${YELLOW}Deploy cancelled. Your backup is still saved.${NC}"
    exit 0
  fi

  # Step 3: Apply migration
  echo ""
  echo -e "${CYAN}Step 3/3: Applying migration...${NC}"

  # Load env
  if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
  fi

  PROJECT_REF=$(echo "${VITE_SUPABASE_URL:-}" | sed -n 's|https://\([a-zA-Z0-9_-]*\)\.supabase\.co|\1|p')

  if [ -z "${PROJECT_REF}" ]; then
    echo -e "${RED}Error: VITE_SUPABASE_URL not set in .env${NC}"
    exit 1
  fi

  # Get DB connection
  DB_URL=$(supabase status --output json 2>/dev/null | grep -o '"database_url": "[^"]*"' | cut -d'"' -f4 || true)

  if [ -z "${DB_URL}" ]; then
    echo -e "${YELLOW}Enter your Supabase database password:${NC}"
    read -s DB_PASSWORD
    DB_URL="postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"
  fi

  psql "${DB_URL}" -f "${MIGRATION_FILE}"

  echo ""
  echo -e "${GREEN}✓ Migration applied successfully!${NC}"
  echo ""
  echo -e "${CYAN}If something is wrong:${NC}"
  echo -e "  ${YELLOW}npm run db:rollback${NC}  — Rollback just this migration"
  echo -e "  ${YELLOW}npm run db:restore${NC}   — Full restore from backup"

else
  echo -e "${CYAN}Step 2-3/3: No migration specified.${NC}"
  echo -e "Backup complete. Ready to deploy app code."
  echo ""
  echo -e "${CYAN}To apply a migration, run:${NC}"
  echo -e "  ${YELLOW}./scripts/db-deploy.sh path/to/migration.sql${NC}"
fi
