# Playoffs Fantasy Football - Setup Guide

## Overview

This document outlines the new Playoffs Fantasy Football web app that has been built. The app allows users to create fantasy teams of 17 players (3 QB, 3 RB, 4 WR, 2 TE, 2 K, 3 FLEX) and compete throughout the NFL playoffs.

## Database Setup

1. **Run the SQL migration**: Execute the `playoffs-schema.sql` file in your Supabase SQL Editor. This will:
   - Add `is_admin` column to `profiles` table
   - Create `players` table for playoff players
   - Create `fantasy_teams` table for user-created teams
   - Create `fantasy_team_players` junction table
   - Set up RLS policies
   - Create scoring calculation functions and triggers

2. **Set admin flag**: To enable admin access, update your profile:
   ```sql
   UPDATE profiles SET is_admin = TRUE WHERE email = 'your-email@example.com';
   ```

## Pages Created

### 1. Dashboard (`/playoffs/dashboard`)
- Shows user's teams (up to 2)
- Displays total points for each team
- Shows leaderboard with all teams
- Allows creating new teams (if under limit and before lock date)
- Mobile-friendly design

### 2. Players Page (`/playoffs/players`)
- View all playoff players in a sortable table
- Filter by position and team
- Search functionality
- Shows player stats and total points
- Mobile-responsive (cards on mobile, table on desktop)

### 3. Team Creation/Editing (`/playoffs/team/[id]` or `/playoffs/team/new`)
- Create or edit fantasy teams
- Searchable player selection for each position
- Validates team composition rules:
  - 14 position-specific slots must have 1 player from each of 14 different NFL teams
  - FLEX positions can be RB/WR/TE from any team
- Mobile-optimized search interface
- Teams locked after January 10, 2026 at noon CST

### 4. Admin Page (`/playoffs/admin`)
- Add new players to the database
- Update player statistics
- Automatically calculates total points using PPR scoring
- Only accessible to users with `is_admin = TRUE`

## API Routes

- `GET /api/playoffs/players` - Get all players (with optional filters)
- `POST /api/playoffs/players` - Create player (admin only)
- `PUT /api/playoffs/players` - Update player (admin only)
- `GET /api/playoffs/teams` - Get teams (optionally filtered by user_id)
- `POST /api/playoffs/teams` - Create team
- `PUT /api/playoffs/teams` - Update team
- `GET /api/playoffs/leaderboard` - Get leaderboard with rankings

## Scoring System (PPR)

Points are automatically calculated using:
- Passing yards: 0.04 per yard
- Passing TDs: 4 points
- INTs: -2 points
- Rushing yards: 0.1 per yard
- Rushing TDs: 6 points
- Receptions: 1 point each
- Receiving yards: 0.1 per yard
- Receiving TDs: 6 points
- Fumbles: -2 points
- Kicking: Manually inputted total

## Team Composition Rules

- **14 Position-Specific Slots**: Must contain exactly 1 player from each of 14 different NFL teams
  - 3 QBs (1 from 3 different teams)
  - 3 RBs (1 from 3 different teams)
  - 4 WRs (1 from 4 different teams)
  - 2 TEs (1 from 2 different teams)
  - 2 Ks (1 from 2 different teams)
- **3 FLEX Slots**: Can be RB, WR, or TE from any team (including teams already used)

## Lock Date

Teams are locked on **January 10, 2026 at noon CST (6 PM UTC)**. After this time:
- No new teams can be created
- Existing teams cannot be edited
- Team creation/editing pages become read-only

## Next Steps

1. Run the SQL migration in Supabase
2. Set your admin flag in the database
3. Add players via the admin page (or directly in the database)
4. Test team creation and validation
5. Share the app with users before the lock date!

## Notes

- Each user can create up to 2 teams
- Teams can have custom names
- All pages are mobile-friendly
- Scoring is calculated automatically via database triggers
- Leaderboard updates in real-time as player stats are updated

