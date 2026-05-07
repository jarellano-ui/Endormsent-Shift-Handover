-- SQL to set up your Supabase database for the Endorsement Matrix App

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'USER',
  position TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  createdBy TEXT,
  assignedTo JSONB DEFAULT '[]'::jsonb,
  createdAt BIGINT,
  updatedAt BIGINT,
  startedAt BIGINT,
  completedAt BIGINT,
  comments JSONB DEFAULT '[]'::jsonb
);

-- Handovers (Endorsements) table
CREATE TABLE IF NOT EXISTS handovers (
  id TEXT PRIMARY KEY,
  fromShift TEXT NOT NULL,
  toShift TEXT NOT NULL,
  endorsedBy JSONB DEFAULT '[]'::jsonb,
  endorsedTo JSONB DEFAULT '[]'::jsonb,
  timestamp BIGINT,
  taskIds JSONB DEFAULT '[]'::jsonb,
  title TEXT,
  description TEXT,
  urgency TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  startedAt BIGINT,
  completedAt BIGINT,
  comments JSONB DEFAULT '[]'::jsonb
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  readBy JSONB DEFAULT '[]'::jsonb,
  assignedToUserIds JSONB DEFAULT '[]'::jsonb,
  linkView TEXT
);

-- Feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  userId TEXT,
  userName TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  status TEXT DEFAULT 'new'
);

-- Enable Row Level Security (RLS) or disable as needed for server-side access
-- If using SUPABASE_SERVICE_ROLE_KEY, it bypasses RLS.
