# Database Deploy & Revert Guide

Quick reference for safely deploying database changes and rolling back if something goes wrong.

---

## Prerequisites

```bash
# Install Supabase CLI (one time)
npm install -g supabase

# Link your project (one time)
supabase link --project-ref <your-project-ref>
```

---

## The Golden Rule

> **Always backup before deploying.** Every script below enforces this.

---

## Commands

### Check Status

```bash
npm run db:status
```

Shows all migrations, which have down-migrations, and available backups.

---

### Create a New Migration

```bash
npm run db:new add-player-leagues
```

Creates two files:
- `supabase/migrations/YYYYMMDDhhmmss_add-player-leagues.sql` — UP migration
- `supabase/migrations/YYYYMMDDhhmmss_add-player-leagues.down.sql` — DOWN migration

**Edit both files.** The down file is your escape hatch.

---

### Deploy a Migration (Safe)

```bash
npm run db:deploy supabase/migrations/015_add-player-leagues.sql
```

This does 3 things automatically:
1. **Backs up** the current database
2. **Shows a preview** of the migration
3. **Applies it** after you confirm

---

### Backup Only (Before App Deploy)

```bash
npm run db:backup
```

Use this when deploying app code that relies on an already-applied migration.

---

### Something Went Wrong — Rollback Last Migration

```bash
npm run db:rollback
```

Runs the `.down.sql` file for the latest migration. Use this if the schema change itself is wrong.

---

### Something Went Wrong — Full Restore

```bash
npm run db:restore latest
```

Restores the **most recent backup**. Requires typing `RESTORE` to confirm.

To restore a specific backup:
```bash
npm run db:restore 20250530-143022
```

---

## Decision Tree

```
Deploy went wrong?
│
├─ Schema change is wrong, no new data written yet
│   └── npm run db:rollback
│
├─ Schema change is wrong, new data was written
│   └── npm run db:restore latest
│
└─ App code bug, schema is fine
    └── Revert the git commit, redeploy app. DB unaffected.
```

---

## Writing Reversible Migrations

**Good (reversible):**
```sql
-- UP
ALTER TABLE sessions ADD COLUMN league_id UUID REFERENCES leagues(id);

-- DOWN
ALTER TABLE sessions DROP COLUMN IF EXISTS league_id;
```

**Bad (not reversible):**
```sql
-- UP
DROP TABLE players;  -- Data is gone forever. No DOWN can fix this.
```

**Rule:** Never `DROP` a table with data. Use `ALTER TABLE ... RENAME TO` instead, or migrate data first.

---

## File Structure

```
supabase/
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 001_initial_schema.down.sql   ← reversible
│   ├── 002_sessions.sql
│   ├── 002_sessions.down.sql         ← reversible
│   └── ...
└── backups/
    ├── backup-20250530-143022.sql    ← auto-created by db:backup
    └── backup-20250530-150511.sql
```

Backups are **gitignored** — they stay local and must be managed manually.
