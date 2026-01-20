-- Update RLS policies to allow inserts/updates without authentication
-- Since we now use password protection at the app level, we can allow these operations
-- Run this in your Supabase SQL Editor

-- Drop existing admin-only policies
DROP POLICY IF EXISTS "Admins can insert players" ON players;
DROP POLICY IF EXISTS "Admins can update players" ON players;

-- Create policies that allow anyone to insert/update (protected by app-level password)
CREATE POLICY "Anyone can insert players" ON players 
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update players" ON players 
FOR UPDATE USING (true);
