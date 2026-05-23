# BWF Tournament Crawler & SQL Seed Specification

## Goal

Create a maintainable crawler system for the badminton application that:

1. Crawls BWF tournament calendar data.
2. Filters only Grade 2 tournaments.
3. Normalizes tournament data.
4. Generates SQL seed files.
5. Allows easy yearly updates.
6. Supports manual corrections.

---

# Business Requirements

The application uses BWF tournaments as references/themes for local club tournaments.

Only Grade 2 tournaments are required.

Supported categories:

| Category | category_slug | category_name |
|---|---|---|
| Level 1 | grade-2-level-1 | BWF World Tour Finals |
| Level 2 | grade-2-level-2 | BWF World Tour Super 1000 |
| Level 3 | grade-2-level-3 | BWF World Tour Super 750 |
| Level 4 | grade-2-level-4 | BWF World Tour Super 500 |
| Level 5 | grade-2-level-5 | BWF World Tour Super 300 |
| Level 6 | grade-2-level-6 | BWF Tour Super 100 |

The crawler should:

- Crawl tournaments for a specific year.
- Generate SQL insert statements.
- Save SQL files into the repository.
- Allow manual editing when BWF data changes.

---

# Source URLs

Base URL:

```txt
https://corporate.bwfbadminton.com/events/calendar/{year}/all/{categoryId}/{categorySlug}/
```

Example:

```txt
https://corporate.bwfbadminton.com/events/calendar/2026/all/23/grade-2-level-2/
```

---

# Category Configuration

Create a constant file:

## File

```txt
src/modules/bwf/constants/bwf-categories.ts
```

## Content

```ts
export const BWF_GRADE_2_CATEGORIES = [
  {
    categoryId: 22,
    categorySlug: 'grade-2-level-1',
    categoryName: 'BWF World Tour Finals',
    priority: 100,
  },
  {
    categoryId: 23,
    categorySlug: 'grade-2-level-2',
    categoryName: 'BWF World Tour Super 1000',
    priority: 90,
  },
  {
    categoryId: 24,
    categorySlug: 'grade-2-level-3',
    categoryName: 'BWF World Tour Super 750',
    priority: 80,
  },
  {
    categoryId: 25,
    categorySlug: 'grade-2-level-4',
    categoryName: 'BWF World Tour Super 500',
    priority: 70,
  },
  {
    categoryId: 26,
    categorySlug: 'grade-2-level-5',
    categoryName: 'BWF World Tour Super 300',
    priority: 60,
  },
  {
    categoryId: 27,
    categorySlug: 'grade-2-level-6',
    categoryName: 'BWF Tour Super 100',
    priority: 50,
  },
] as const;
```

---

# Database Schema

## Table

```sql
CREATE TABLE bwf_tournaments (
  id BIGSERIAL PRIMARY KEY,

  name VARCHAR(255) NOT NULL,

  start_date DATE,
  end_date DATE,

  category_slug VARCHAR(100) NOT NULL,
  category_name VARCHAR(255) NOT NULL,

  venue VARCHAR(255),

  priority INTEGER DEFAULT 0,

  source_url TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

# Recommended Project Structure

```txt
src/
  modules/
    bwf/
      constants/
        bwf-categories.ts

      crawler/
        bwf-crawler.service.ts
        bwf-parser.service.ts
        bwf-sql-generator.service.ts

      scripts/
        crawl-bwf-year.ts

      types/
        bwf-tournament.type.ts

      output/
        2026-bwf-tournaments.sql
        2027-bwf-tournaments.sql
```

---

# Data Model

## File

```txt
src/modules/bwf/types/bwf-tournament.type.ts
```

## Content

```ts
export type BwfTournament = {
  name: string;

  startDate: string | null;
  endDate: string | null;

  categorySlug: string;
  categoryName: string;

  venue: string | null;

  priority: number;

  sourceUrl: string;
};
```

---

# Crawl Flow

## Step 1

Loop all Grade 2 categories.

## Step 2

Build calendar URL.

Example:

```ts
const url = `https://corporate.bwfbadminton.com/events/calendar/${year}/all/${categoryId}/${categorySlug}/`;
```

## Step 3

Fetch HTML.

## Step 4

Parse tournaments.

Extract:

- tournament name
- start date
- end date
- venue
- source url

## Step 5

Normalize data.

## Step 6

Generate SQL file.

## Step 7

Save SQL file.

---

# Parser Requirements

Use:

- axios
- cheerio

The parser must:

- safely handle missing dates
- safely handle missing venue
- trim all text
- remove duplicate tournaments
- normalize whitespace

---

# SQL Generator Rules

Generate output format:

```sql
INSERT INTO bwf_tournaments
(name, start_date, end_date, category_slug, category_name, venue)
VALUES
  ('Malaysia Open 2026', '2026-01-06', '2026-01-11', 'grade-2-level-2', 'BWF World Tour Super 1000', 'Kuala Lumpur, Malaysia');
```

Requirements:

- Escape single quotes.
- Use NULL instead of invalid dates.
- One INSERT statement for the whole year.
- Stable output ordering.
- Sort by start date ascending.

---

# Duplicate Detection

Duplicate detection key:

```txt
name + start_date
```

If duplicates exist:

- keep the higher priority tournament
- or keep the first crawled record

---

# Manual Maintenance Strategy

Because BWF pages may change:

- SQL files are committed into Git.
- Generated SQL can be manually edited.
- Manual changes are the source of truth.
- Crawler is only used to bootstrap/update.

Recommended process:

```txt
1. Run crawler for new year.
2. Generate SQL file.
3. Review SQL manually.
4. Fix missing dates or venues.
5. Commit SQL into repository.
6. Run migration or seed.
```

---

# NPM Scripts

## package.json

```json
{
  "scripts": {
    "crawl:bwf:2026": "tsx src/modules/bwf/scripts/crawl-bwf-year.ts 2026",
    "crawl:bwf:2027": "tsx src/modules/bwf/scripts/crawl-bwf-year.ts 2027"
  }
}
```

---

# Crawl Script Example

## File

```txt
src/modules/bwf/scripts/crawl-bwf-year.ts
```

## Example

```ts
import { crawlBwfYear } from '../crawler/bwf-crawler.service';

const year = Number(process.argv[2]);

if (!year) {
  throw new Error('Year is required');
}

async function bootstrap() {
  await crawlBwfYear(year);

  console.log(`BWF tournaments for ${year} generated successfully.`);
}

bootstrap();
```

---

# SQL Output Path

```txt
src/modules/bwf/output/{year}-bwf-tournaments.sql
```

Example:

```txt
src/modules/bwf/output/2027-bwf-tournaments.sql
```

---

# Recommended Crawl Frequency

Recommended:

```txt
Once per year
```

Optional:

```txt
Monthly refresh during season
```

---

# Error Handling

Crawler should:

- continue when one category fails
- log failed category URL
- retry HTTP requests
- timeout after 15 seconds
- skip malformed tournament blocks

---

# Logging

Recommended logs:

```txt
[INFO] Crawling grade-2-level-2...
[INFO] Found 12 tournaments
[WARN] Missing venue for Japan Open 2027
[ERROR] Failed to fetch URL
[INFO] SQL generated successfully
```

---

# Testing Requirements

Test cases:

- parse valid tournament
- parse missing venue
- parse missing dates
- deduplicate tournaments
- generate valid SQL
- escape single quotes correctly
- sort tournaments correctly

---

# Recommended Dependencies

```bash
npm install axios cheerio dayjs
npm install -D tsx typescript @types/node
```

---

# Future Improvements

Possible future upgrades:

- Auto-sync yearly updates
- Store tournament logos
- Store prize money
- Store tournament level enum
- Store city/country separately
- Add admin UI for corrections
- Add diff checking between years
- Add automatic DB seeding

---

# Example Final SQL Output

```sql
INSERT INTO bwf_tournaments
(name, start_date, end_date, category_slug, category_name, venue)
VALUES
  ('Malaysia Open 2027', '2027-01-05', '2027-01-10', 'grade-2-level-2', 'BWF World Tour Super 1000', 'Kuala Lumpur, Malaysia'),

  ('India Open 2027', '2027-01-12', '2027-01-17', 'grade-2-level-3', 'BWF World Tour Super 750', 'New Delhi, India');
```

---

# Prompt For AI Coding Agent

```txt
Build a BWF tournament crawler module for a badminton application.

Requirements:

1. Crawl BWF calendar pages.
2. Only crawl Grade 2 tournaments.
3. Support:
   - grade-2-level-1
   - grade-2-level-2
   - grade-2-level-3
   - grade-2-level-4
   - grade-2-level-5
   - grade-2-level-6

4. Fetch data from:
   https://corporate.bwfbadminton.com/events/calendar/{year}/all/{categoryId}/{categorySlug}/

5. Parse:
   - tournament name
   - start date
   - end date
   - venue
   - source url

6. Normalize data into TypeScript types.

7. Remove duplicates.

8. Sort tournaments by start date.

9. Generate SQL insert files.

10. Save SQL files into:
    src/modules/bwf/output/

11. SQL format:

INSERT INTO bwf_tournaments
(name, start_date, end_date, category_slug, category_name, venue)
VALUES
  (...);

12. Use:
   - axios
   - cheerio
   - TypeScript

13. Add:
   - retry handling
   - timeout handling
   - logging
   - parser tests
   - SQL generator tests

14. Ensure crawler is maintainable and supports yearly updates.

15. Generated SQL files should be manually editable and committed into Git.
```

