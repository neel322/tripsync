-- ============================================================
-- TripSync Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRIPS
-- ============================================================
CREATE TABLE IF NOT EXISTS trips (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT NOT NULL,
  destination  TEXT NOT NULL,
  description  TEXT DEFAULT '',
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  budget       NUMERIC(12, 2) DEFAULT 0,
  invite_code  TEXT NOT NULL UNIQUE,
  organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trips_organizer ON trips(organizer_id);
CREATE INDEX IF NOT EXISTS idx_trips_invite_code ON trips(invite_code);

-- ============================================================
-- TRIP MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS trip_members (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id   UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('organizer', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(trip_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_trip_members_trip ON trip_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_user ON trip_members(user_id);

-- ============================================================
-- ITINERARY ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS itinerary_items (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id        UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT DEFAULT '',
  day_number     INTEGER NOT NULL,
  time           TEXT,
  location       TEXT DEFAULT '',
  type           TEXT DEFAULT 'activity' CHECK (type IN ('activity', 'travel', 'food', 'accommodation', 'other')),
  estimated_cost NUMERIC(10, 2) DEFAULT 0,
  order_index    INTEGER DEFAULT 0,
  created_by     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_itinerary_trip ON itinerary_items(trip_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_day ON itinerary_items(trip_id, day_number);

-- ============================================================
-- POLLS
-- ============================================================
CREATE TABLE IF NOT EXISTS polls (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id    UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  question   TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  closes_at  TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_polls_trip ON polls(trip_id);

-- ============================================================
-- POLL OPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS poll_options (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id     UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON poll_options(poll_id);

-- ============================================================
-- POLL VOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS poll_votes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id    UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id  UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(poll_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option ON poll_votes(option_id);

-- ============================================================
-- EXPENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id    UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  amount     NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  category   TEXT DEFAULT 'other' CHECK (category IN ('food', 'transport', 'accommodation', 'activity', 'shopping', 'other')),
  paid_by    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_by   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notes      TEXT DEFAULT '',
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_trip ON expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON expenses(paid_by);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Optional but recommended
-- Disable if using service role key from backend
-- ============================================================
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- EXPENSE SPLITS — tracks exactly which members share each expense
-- ============================================================
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
