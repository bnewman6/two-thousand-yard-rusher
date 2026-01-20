# Team Import Guide

## Setup (One-time)

1. **Update RLS Policies**: Run `update-rls-for-teams-no-auth.sql` in your Supabase SQL Editor. This allows team creation without authentication.

2. **Make user_id nullable** (recommended): The SQL script includes an option to make `user_id` nullable in the `fantasy_teams` table. This is recommended if you're not tracking individual users for imported teams.

## CSV Format

Your CSV should have this structure:
- **Row 1**: Headers are the actual **team names** (e.g., "My Awesome Team", "Another Team", etc.)
- **Row 2**: Points row (optional - may have point totals or be empty, will be auto-detected)
- **Rows 3-19**: 17 players per team (one player per row)

Example:
```
My Awesome Team,Pts 1,Another Team,Pts 2
,125.5,,118.2
Patrick Mahomes,25.5,Tyler Mahomes,30.2
Josh Allen,20.0,...
... (15 more player rows)
```

**Note**: The "Pts" columns are optional and will be automatically ignored. Only columns with team names (not "Pts", "PTS", or "Points") will be treated as teams.

**Important**: The 17 players must be in this order:
1. QB1, QB2, QB3 (3 QBs)
2. RB1, RB2, RB3 (3 RBs)
3. WR1, WR2, WR3, WR4 (4 WRs)
4. TE1, TE2 (2 TEs)
5. K1, K2 (2 Ks)
6. FLEX1, FLEX2, FLEX3 (3 FLEX)

## Import Methods

### Method 1: CSV Import via Admin Page (Recommended)
1. Go to Admin page
2. Use the "Import Teams" feature (coming soon)
3. Upload your CSV file
4. Teams will be automatically matched to players by name

### Method 2: API Call
You can call the API directly:

```bash
curl -X POST http://localhost:3000/api/playoffs/teams/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "csv": "Team 1,Pts 1\nMy Team,\nPatrick Mahomes,..."
  }'
```

Or with a parsed teams array:
```json
{
  "teams": [
    {
      "team_name": "My Team",
      "players": ["Patrick Mahomes", "Josh Allen", ...]
    }
  ]
}
```

### Method 3: Direct SQL (Simplified)
If you prefer SQL, you can insert teams directly. First, ensure players exist and get their IDs:

```sql
-- Example: Insert a team
INSERT INTO fantasy_teams (team_name, is_locked, user_id)
VALUES ('My Team', true, NULL);

-- Then link players (replace UUIDs with actual player IDs)
INSERT INTO fantasy_team_players (fantasy_team_id, player_id, position_slot)
VALUES
  ('<team-uuid>', '<player-uuid-1>', 'QB1'),
  ('<team-uuid>', '<player-uuid-2>', 'QB2'),
  ... -- 15 more rows
```

## Player Name Matching

Players are matched by name (case-insensitive). If a player name in your CSV doesn't match exactly, you'll get an error listing which players couldn't be found.

## Notes

- Imported teams are automatically locked (`is_locked: true`)
- Teams with duplicate names will be skipped
- The import will report how many teams were inserted and list any errors
