-- Update RLS policies to allow team creation without authentication
-- Since we're importing teams from CSV, we need to allow inserts without auth
-- Run this in your Supabase SQL Editor

-- Drop existing user-based policies for fantasy_teams
DROP POLICY IF EXISTS "Users can insert own fantasy teams" ON fantasy_teams;
DROP POLICY IF EXISTS "Users can update own fantasy teams" ON fantasy_teams;
DROP POLICY IF EXISTS "Users can delete own fantasy teams" ON fantasy_teams;

-- Create policies that allow anyone to insert/update/delete (protected by app-level password)
CREATE POLICY "Anyone can insert fantasy teams" ON fantasy_teams 
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update fantasy teams" ON fantasy_teams 
FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can delete fantasy teams" ON fantasy_teams 
FOR DELETE USING (true);

-- Drop existing user-based policies for fantasy_team_players
DROP POLICY IF EXISTS "Users can manage players on own teams" ON fantasy_team_players;

-- Create policy that allows anyone to manage team players
CREATE POLICY "Anyone can manage fantasy team players" ON fantasy_team_players 
FOR ALL USING (true) WITH CHECK (true);

-- Option 1: Make user_id nullable (recommended if you don't track individual users)
ALTER TABLE fantasy_teams ALTER COLUMN user_id DROP NOT NULL;

-- Option 2: If you want to keep user_id required, create a system user:
-- INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
-- VALUES (
--   '00000000-0000-0000-0000-000000000000'::uuid,
--   'system@imported-teams.local',
--   crypt('dummy-password', gen_salt('bf')),
--   NOW(),
--   NOW(),
--   NOW()
-- )
-- ON CONFLICT (id) DO NOTHING;
