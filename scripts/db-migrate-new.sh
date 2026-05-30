#!/bin/bash
# db-migrate-new.sh — Create a new migration with optional down-migration template
# Usage: ./scripts/db-migrate-new.sh <name>
#   or:  ./scripts/db-migrate-new.sh --down <existing-migration-name>
#
# Examples:
#   ./scripts/db-migrate-new.sh add-player-leagues
#   ./scripts/db-migrate-new.sh --down 014_restrict_bwf_session_label

set -euo pipefail

MIGRATIONS_DIR="supabase/migrations"

YELLOW='\033[1;33m'
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

# Parse args
DOWN_MODE=false
NAME=""

for arg in "$@"; do
  if [ "${arg}" == "--down" ]; then
    DOWN_MODE=true
  else
    NAME="${arg}"
  fi
done

if [ -z "${NAME}" ]; then
  echo -e "${YELLOW}Usage:${NC}"
  echo -e "  ./scripts/db-migrate-new.sh <migration-name>"
  echo -e "  ./scripts/db-migrate-new.sh --down <existing-migration-name>"
  exit 1
fi

if [ "${DOWN_MODE}" == true ]; then
  # Create down-migration for existing migration
  EXISTING=$(ls -1 "${MIGRATIONS_DIR}"/*"${NAME}"*.sql 2>/dev/null | grep -v '\.down\.sql$' | head -1)

  if [ -z "${EXISTING}" ]; then
    echo -e "Error: No migration matching '${NAME}' found"
    exit 1
  fi

  DOWN_FILE="${EXISTING%.sql}.down.sql"

  if [ -f "${DOWN_FILE}" ]; then
    echo -e "Down-migration already exists: ${DOWN_FILE}"
    exit 0
  fi

  cat > "${DOWN_FILE}" << 'EOF'
-- Down-migration: reverse the changes made in the corresponding up-migration
-- Add your ROLLBACK statements here

-- Example:
-- ALTER TABLE sessions DROP COLUMN IF EXISTS new_column;
-- DROP TABLE IF EXISTS new_table;
EOF

  echo -e "${GREEN}✓ Created down-migration:${NC} ${DOWN_FILE}"
  echo -e "${YELLOW}Edit this file to add your rollback statements.${NC}"

else
  # Create new migration pair
  TIMESTAMP=$(date +%Y%m%d%H%M%S)
  MIGRATION_FILE="${MIGRATIONS_DIR}/${TIMESTAMP}_${NAME}.sql"
  DOWN_FILE="${MIGRATIONS_DIR}/${TIMESTAMP}_${NAME}.down.sql"

  cat > "${MIGRATION_FILE}" << EOF
-- Migration: ${NAME}
-- Created: $(date)

-- Add your schema changes here

-- Example:
-- ALTER TABLE sessions ADD COLUMN league_id UUID REFERENCES leagues(id);
-- CREATE TABLE leagues (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   name TEXT NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT now()
-- );
EOF

  cat > "${DOWN_FILE}" << EOF
-- Down-migration: ${NAME}
-- Reverses the changes made in ${TIMESTAMP}_${NAME}.sql

-- Add your ROLLBACK statements here
-- ALTER TABLE sessions DROP COLUMN IF EXISTS league_id;
-- DROP TABLE IF EXISTS leagues;
EOF

  echo -e "${GREEN}✓ Created migration:${NC}"
  echo -e "  ${BLUE}Up:${NC}   ${MIGRATION_FILE}"
  echo -e "  ${BLUE}Down:${NC} ${DOWN_FILE}"
  echo ""
  echo -e "${YELLOW}Remember to:${NC}"
  echo -e "  1. Edit the UP file with your schema changes"
  echo -e "  2. Edit the DOWN file with rollback statements"
  echo -e "  3. Test both locally before deploying"
fi
