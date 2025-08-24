-- Fantasy Football Rush Database Setup
-- Run this entire script in your Supabase SQL Editor

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  team_name TEXT NOT NULL,
  team_logo_data TEXT,
  total_yards INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);



-- Create running_backs table for caching NFL data
CREATE TABLE running_backs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id TEXT NOT NULL,
  name TEXT NOT NULL,
  team TEXT NOT NULL,
  position TEXT DEFAULT 'RB',
  season INTEGER NOT NULL,
  week INTEGER NOT NULL,
  yards INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 1,
  is_locked BOOLEAN DEFAULT FALSE,
  game_start_time TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(player_id, season, week)
);

-- Create games table for tracking game status
CREATE TABLE games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id TEXT UNIQUE NOT NULL,
  season INTEGER NOT NULL,
  week INTEGER NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  game_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'scheduled', -- scheduled, live, final, postponed, cancelled
  quarter INTEGER DEFAULT 0,
  time_remaining TEXT,
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create weekly_picks table with game status tracking
CREATE TABLE weekly_picks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  week INTEGER NOT NULL,
  season INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  player_id TEXT NOT NULL,
  yards_gained INTEGER DEFAULT 0,
  is_finalized BOOLEAN DEFAULT FALSE,
  game_status TEXT DEFAULT 'pending', -- pending, locked, final
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, week, season)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE running_backs ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Create policies for weekly_picks
CREATE POLICY "Users can view all weekly picks" ON weekly_picks FOR SELECT USING (true);
CREATE POLICY "Users can update own picks" ON weekly_picks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own picks" ON weekly_picks FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for running_backs
CREATE POLICY "Anyone can view running backs" ON running_backs FOR SELECT USING (true);
CREATE POLICY "Anyone can update running backs" ON running_backs FOR UPDATE USING (true);

-- Create policies for games
CREATE POLICY "Anyone can view games" ON games FOR SELECT USING (true);
CREATE POLICY "Anyone can update games" ON games FOR UPDATE USING (true);
CREATE POLICY "Anyone can insert games" ON games FOR INSERT WITH CHECK (true);

-- Create function to handle user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, team_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'team_name', 'Team ' || NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create function to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_weekly_picks_updated_at BEFORE UPDATE ON weekly_picks
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_running_backs_updated_at BEFORE UPDATE ON running_backs
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Create function to increment total yards safely
CREATE OR REPLACE FUNCTION increment_total_yards(user_id UUID, yards_to_add INTEGER)
RETURNS INTEGER AS $$
DECLARE
  current_total INTEGER;
BEGIN
  -- Get current total yards
  SELECT total_yards INTO current_total
  FROM profiles
  WHERE id = user_id;
  
  -- Return new total (add the yards)
  RETURN COALESCE(current_total, 0) + yards_to_add;
END;
$$ LANGUAGE plpgsql;
