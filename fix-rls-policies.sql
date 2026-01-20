-- Fix RLS policies for running_backs table
-- Run this in your Supabase SQL Editor

-- Add missing INSERT policy for running_backs
CREATE POLICY "Anyone can insert running backs" ON running_backs 
FOR INSERT WITH CHECK (true);

-- Add missing INSERT policy for games (if not already exists)
CREATE POLICY "Anyone can insert games" ON games 
FOR INSERT WITH CHECK (true);
