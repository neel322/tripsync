-- ============================================================
-- TripSync Schema Migrations
-- Run these in your Supabase SQL Editor AFTER the base schema
-- ============================================================

-- 1. Add status column to trips
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'upcoming'
  CHECK (status IN ('upcoming', 'completed', 'cancelled'));

-- 2. expense_splits — tracks which members share each expense
CREATE TABLE IF NOT EXISTS expense_splits (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share      NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(expense_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_expense_splits_expense ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user    ON expense_splits(user_id);
