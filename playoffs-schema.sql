-- Playoffs Fantasy Football Database Schema
-- Run this script in your Supabase SQL Editor to set up the new playoffs structure

-- Add is_admin column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create players table for playoff players
CREATE TABLE IF NOT EXISTS players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT NOT NULL CHECK (position IN ('QB', 'RB', 'WR', 'TE', 'K')),
  nfl_team TEXT NOT NULL,
  eliminated BOOLEAN DEFAULT FALSE,
  -- Stats
  passing_yds INTEGER DEFAULT 0,
  passing_td INTEGER DEFAULT 0,
  int INTEGER DEFAULT 0,
  rush_yds INTEGER DEFAULT 0,
  rush_td INTEGER DEFAULT 0,
  rec INTEGER DEFAULT 0,
  rec_yds INTEGER DEFAULT 0,
  rec_td INTEGER DEFAULT 0,
  fum INTEGER DEFAULT 0,
  kicking_pts NUMERIC(10, 2) DEFAULT 0,
  tot_pts NUMERIC(10, 2) DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create fantasy_teams table (user-created teams)
CREATE TABLE IF NOT EXISTS fantasy_teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_name TEXT NOT NULL,
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create fantasy_team_players table (junction table)
CREATE TABLE IF NOT EXISTS fantasy_team_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fantasy_team_id UUID REFERENCES fantasy_teams(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  position_slot TEXT NOT NULL CHECK (position_slot IN ('QB1', 'QB2', 'QB3', 'RB1', 'RB2', 'RB3', 'WR1', 'WR2', 'WR3', 'WR4', 'TE1', 'TE2', 'K1', 'K2', 'FLEX1', 'FLEX2', 'FLEX3')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(fantasy_team_id, position_slot)
);

-- Enable Row Level Security
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_team_players ENABLE ROW LEVEL SECURITY;

-- RLS Policies for players
CREATE POLICY "Anyone can view players" ON players FOR SELECT USING (true);
CREATE POLICY "Admins can insert players" ON players FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  );
CREATE POLICY "Admins can update players" ON players FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  );

-- RLS Policies for fantasy_teams
CREATE POLICY "Anyone can view fantasy teams" ON fantasy_teams FOR SELECT USING (true);
CREATE POLICY "Users can insert own fantasy teams" ON fantasy_teams FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own fantasy teams" ON fantasy_teams FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own fantasy teams" ON fantasy_teams FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for fantasy_team_players
CREATE POLICY "Anyone can view fantasy team players" ON fantasy_team_players FOR SELECT USING (true);
CREATE POLICY "Users can manage players on own teams" ON fantasy_team_players FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM fantasy_teams 
      WHERE fantasy_teams.id = fantasy_team_players.fantasy_team_id 
      AND fantasy_teams.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fantasy_teams 
      WHERE fantasy_teams.id = fantasy_team_players.fantasy_team_id 
      AND fantasy_teams.user_id = auth.uid()
    )
  );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_players_nfl_team ON players(nfl_team);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);
CREATE INDEX IF NOT EXISTS idx_fantasy_teams_user_id ON fantasy_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_fantasy_team_players_team_id ON fantasy_team_players(fantasy_team_id);
CREATE INDEX IF NOT EXISTS idx_fantasy_team_players_player_id ON fantasy_team_players(player_id);

-- Function to calculate total points (PPR scoring)
CREATE OR REPLACE FUNCTION calculate_player_points(
  p_passing_yds INTEGER,
  p_passing_td INTEGER,
  p_int INTEGER,
  p_rush_yds INTEGER,
  p_rush_td INTEGER,
  p_rec INTEGER,
  p_rec_yds INTEGER,
  p_rec_td INTEGER,
  p_fum INTEGER,
  p_kicking_pts NUMERIC
) RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    (p_passing_yds * 0.04) +
    (p_passing_td * 4) +
    (p_int * -2) +
    (p_rush_yds * 0.1) +
    (p_rush_td * 6) +
    (p_rec * 1) +
    (p_rec_yds * 0.1) +
    (p_rec_td * 6) +
    (p_fum * -2) +
    COALESCE(p_kicking_pts, 0)
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update tot_pts when stats change
CREATE OR REPLACE FUNCTION update_player_points()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tot_pts = calculate_player_points(
    NEW.passing_yds,
    NEW.passing_td,
    NEW.int,
    NEW.rush_yds,
    NEW.rush_td,
    NEW.rec,
    NEW.rec_yds,
    NEW.rec_td,
    NEW.fum,
    NEW.kicking_pts
  );
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_player_points
  BEFORE INSERT OR UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_player_points();

-- Function to get fantasy team total points
CREATE OR REPLACE FUNCTION get_fantasy_team_total_points(p_fantasy_team_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(p.tot_pts), 0)
  INTO v_total
  FROM fantasy_team_players ftp
  JOIN players p ON ftp.player_id = p.id
  WHERE ftp.fantasy_team_id = p_fantasy_team_id;
  
  RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- Function to check if teams are locked (based on lock date: Jan 10, 2026 12:00 PM CST)
CREATE OR REPLACE FUNCTION are_teams_locked()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOW() >= '2026-01-10 18:00:00+00'::timestamptz; -- Noon CST = 6 PM UTC
END;
$$ LANGUAGE plpgsql;

