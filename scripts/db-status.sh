#!/bin/bash
# db-status.sh — Show database migration status and available backups
# Usage: ./scripts/db-status.sh

set -euo pipefail

MIGRATIONS_DIR="supabase/migrations"
BACKUP_DIR="supabase/backups"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Database Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Migrations
echo -e "${CYAN}Migrations (${MIGRATIONS_DIR}):${NC}"
MIGRATION_COUNT=$(ls -1 "${MIGRATIONS_DIR}"/*.sql 2>/dev/null | grep -v '\.down\.sql$' | wc -l | tr -d ' ')
echo -e "  Total: ${YELLOW}${MIGRATION_COUNT}${NC}"
echo ""

# List migrations with down-file status
ls -1 "${MIGRATIONS_DIR}"/*.sql 2>/dev/null | grep -v '\.down\.sql$' | while read -r file; do
  name=$(basename "${file}")
  down_file="${file%.sql}.down.sql"
  if [ -f "${down_file}" ]; then
    echo -e "  ${GREEN}✓${NC} ${name} ${GREEN}(reversible)${NC}"
  else
    echo -e "  ${YELLOW}○${NC} ${name} ${YELLOW}(no down-migration)${NC}"
  fi
done

echo ""

# Backups
echo -e "${CYAN}Backups (${BACKUP_DIR}):${NC}"
if [ -d "${BACKUP_DIR}" ]; then
  BACKUP_COUNT=$(ls -1 "${BACKUP_DIR}"/*.sql 2>/dev/null | wc -l | tr -d ' ')
  if [ "${BACKUP_COUNT}" -gt 0 ]; then
    echo -e "  Total: ${YELLOW}${BACKUP_COUNT}${NC}"
    echo ""
    ls -lt "${BACKUP_DIR}"/*.sql 2>/dev/null | head -5 | while read -r line; do
      size=$(echo "${line}" | awk '{print $5}')
      file=$(echo "${line}" | awk '{print $9}')
      name=$(basename "${file}")
      echo -e "  ${GREEN}•${NC} ${name} (${size} bytes)"
    done
    if [ "${BACKUP_COUNT}" -gt 5 ]; then
      echo -e "  ... and $((BACKUP_COUNT - 5)) more"
    fi
  else
    echo -e "  ${YELLOW}No backups found${NC}"
    echo -e "  Run: ${YELLOW}npm run db:backup${NC} to create one"
  fi
else
  echo -e "  ${YELLOW}No backup directory yet${NC}"
fi

echo ""
echo -e "${CYAN}Quick Commands:${NC}"
echo -e "  ${YELLOW}npm run db:backup${NC}     — Backup before deploy"
echo -e "  ${YELLOW}npm run db:restore${NC}    — Restore from backup"
echo -e "  ${YELLOW}npm run db:rollback${NC}   — Rollback last migration"
echo -e "  ${YELLOW}npm run db:new${NC}        — Create new migration"
