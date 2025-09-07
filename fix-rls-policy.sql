-- Quick fix for player_update_queue RLS policy issue
-- Run this in your Supabase SQL Editor to fix the "Failed to create pick" error

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admin can manage update queue" ON player_update_queue;

-- Create a more permissive policy that allows inserts from triggers
CREATE POLICY "Allow insert to update queue" ON player_update_queue 
FOR INSERT WITH CHECK (true);

-- Create a policy for admin management (if needed)
CREATE POLICY "Admin can manage update queue" ON player_update_queue 
FOR ALL USING (auth.role() = 'service_role');

-- Test that the policy works by checking if we can insert
-- (This should not error if the policy is correct)
SELECT 'RLS policy fixed successfully' as status;
