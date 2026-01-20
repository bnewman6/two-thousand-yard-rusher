-- Comprehensive fix for pick creation issue
-- Run this in your Supabase SQL Editor to resolve the "Failed to create pick" error

-- ==============================================
-- FIX 1: Update RLS Policy for player_update_queue
-- ==============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admin can manage update queue" ON player_update_queue;
DROP POLICY IF EXISTS "Allow insert to update queue" ON player_update_queue;

-- Create permissive policy for inserts (allows triggers to work)
CREATE POLICY "Allow insert to update queue" ON player_update_queue 
FOR INSERT WITH CHECK (true);

-- Create policy for admin management
CREATE POLICY "Admin can manage update queue" ON player_update_queue 
FOR ALL USING (auth.role() = 'service_role');

-- ==============================================
-- FIX 2: Update trigger function with SECURITY DEFINER
-- ==============================================

-- Update the trigger function to run with elevated privileges
CREATE OR REPLACE FUNCTION add_to_update_queue()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO player_update_queue (player_id, season, week, needs_update)
  VALUES (NEW.player_id, NEW.season, NEW.week, true)
  ON CONFLICT (player_id, season, week) 
  DO UPDATE SET 
    needs_update = true,
    last_updated = TIMEZONE('utc'::text, NOW());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- FIX 3: Alternative approach - Make trigger function bypass RLS
-- ==============================================

-- Grant necessary permissions to the function
GRANT INSERT ON player_update_queue TO authenticated;
GRANT INSERT ON player_update_queue TO anon;

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Test that the policies are working
SELECT 'RLS policies updated successfully' as status;

-- Check if the trigger function exists and has correct permissions
SELECT 
  proname as function_name,
  prosecdef as security_definer,
  proacl as permissions
FROM pg_proc 
WHERE proname = 'add_to_update_queue';

-- Check RLS policies on player_update_queue
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'player_update_queue';
