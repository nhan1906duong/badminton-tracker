#!/bin/bash
# db-rollback.sh — Rollback the last applied migration using its down file
# Usage: ./scripts/db-rollback.sh
#
# Looks for a .down.sql file matching the latest migration and runs it.
# Safer than full restore — only reverses the last schema change.

set -euo pipefail

MIGRATIONS_DIR="supabase/migrations"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Migration Rollback ===${NC}"

# Find latest migration file
LATEST_MIGRATION=$(ls -1 "${MIGRATIONS_DIR}"/*.sql 2>/dev/null | grep -v '\.down\.sql$' | sort | tail -1)

if [ -z "${LATEST_MIGRATION}" ]; then
  echo -e "${RED}No migrations found in ${MIGRATIONS_DIR}/${NC}"
  exit 1
fi

MIGRATION_NAME=$(basename "${LATEST_MIGRATION}")
DOWN_FILE="${LATEST_MIGRATION%.sql}.down.sql"

echo -e "Latest migration: ${YELLOW}${MIGRATION_NAME}${NC}"

if [ ! -f "${DOWN_FILE}" ]; then
  echo -e "${RED}Error: No down-migration file found.${NC}"
  echo -e "Expected: ${YELLOW}${DOWN_FILE}${NC}"
  echo ""
  echo -e "${YELLOW}To create a down-migration, run:${NC}"
  echo -e "  ${YELLOW}./scripts/db-migrate-new.sh --down <migration-name>${NC}"
  echo ""
  echo -e "${BLUE}Alternatively, restore from full backup:${NC}"
  echo -e "  ${YELLOW}./scripts/db-restore.sh latest${NC}"
  exit 1
fi

echo -e "Down file: ${YELLOW}$(basename "${DOWN_FILE}")${NC}"
echo ""
echo -e "${YELLOW}This will run the DOWN migration to reverse:${NC}"
echo -e "  ${MIGRATION_NAME}"
echo ""

read -p "Rollback this migration? (yes/no): " CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
  echo -e "${YELLOW}Cancelled.${NC}"
  exit 0
fi

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

echo -e "${BLUE}Running down-migration...${NC}"
psql "${DB_URL}" -f "${DOWN_FILE}"

echo -e "${GREEN}✓ Rollback complete: ${MIGRATION_NAME} reversed${NC}"
echo ""
echo -e "${YELLOW}Note:${NC} The migration file was NOT deleted."
echo -e "If you need to re-apply it, run the up migration manually."
