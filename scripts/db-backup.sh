#!/bin/bash
# db-backup.sh — Backup Supabase database before deploy
# Usage: ./scripts/db-backup.sh [production|local]
#
# Creates timestamped SQL dump in supabase/backups/
# Run this BEFORE deploying a feature with DB changes.

set -euo pipefail

ENVIRONMENT="${1:-production}"
BACKUP_DIR="supabase/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup-${TIMESTAMP}.sql"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

mkdir -p "${BACKUP_DIR}"

echo -e "${BLUE}=== Database Backup ===${NC}"
echo -e "Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "Backup file: ${YELLOW}${BACKUP_FILE}${NC}"

# Load env vars
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ "${ENVIRONMENT}" == "local" ]; then
  echo -e "${BLUE}Backing up local Supabase...${NC}"
  if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: supabase CLI not found. Install with: npm install -g supabase${NC}"
    exit 1
  fi
  supabase db dump -f "${BACKUP_FILE}"
else
  echo -e "${BLUE}Backing up production database...${NC}"

  # Extract project ref from VITE_SUPABASE_URL
  if [ -z "${VITE_SUPABASE_URL:-}" ]; then
    echo -e "${RED}Error: VITE_SUPABASE_URL not set in .env${NC}"
    exit 1
  fi

  PROJECT_REF=$(echo "${VITE_SUPABASE_URL}" | sed -n 's|https://\([a-zA-Z0-9_-]*\)\.supabase\.co|\1|p')

  if [ -z "${PROJECT_REF}" ]; then
    echo -e "${RED}Error: Could not extract project ref from VITE_SUPABASE_URL${NC}"
    exit 1
  fi

  if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: supabase CLI not found. Install with: npm install -g supabase${NC}"
    exit 1
  fi

  # Check if linked
  if ! supabase status &> /dev/null; then
    echo -e "${YELLOW}Linking to project ${PROJECT_REF}...${NC}"
    supabase link --project-ref "${PROJECT_REF}"
  fi

  supabase db dump --db-url "${VITE_SUPABASE_URL}" -f "${BACKUP_FILE}"
fi

if [ -f "${BACKUP_FILE}" ]; then
  SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
  echo -e "${GREEN}✓ Backup complete: ${BACKUP_FILE} (${SIZE})${NC}"
  echo ""
  echo -e "${BLUE}To restore this backup:${NC}"
  echo -e "  ${YELLOW}./scripts/db-restore.sh ${TIMESTAMP}${NC}"
else
  echo -e "${RED}✗ Backup failed${NC}"
  exit 1
fi
