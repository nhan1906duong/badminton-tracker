-- Add tournament category link to sessions

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS category_slug TEXT;
