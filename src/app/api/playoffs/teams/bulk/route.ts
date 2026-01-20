import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { parseTeamCSV, ParsedTeam } from '@/lib/team-csv-parser'

// Standard position slot order: 3 QB, 3 RB, 4 WR, 2 TE, 2 K, 3 FLEX
const POSITION_SLOTS: string[] = [
  'QB1', 'QB2', 'QB3',
  'RB1', 'RB2', 'RB3',
  'WR1', 'WR2', 'WR3', 'WR4',
  'TE1', 'TE2',
  'K1', 'K2',
  'FLEX1', 'FLEX2', 'FLEX3'
]

// System user ID for imported teams (you may need to create this user in auth.users)
// Or make user_id nullable in the schema
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000'

// POST - Bulk import teams from CSV data
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    // Accept either parsed teams array or raw CSV text
    let teams: ParsedTeam[]
    if (body.csv) {
      // Parse CSV text
      teams = parseTeamCSV(body.csv)
    } else if (body.teams && Array.isArray(body.teams)) {
      // Use provided teams array
      teams = body.teams.map((t: any) => ({
        team_name: t.team_name,
        players: Array.isArray(t.players) ? t.players : []
      }))
    } else {
      return NextResponse.json({ error: 'Either "csv" text or "teams" array required' }, { status: 400 })
    }


    // Ensure system user exists in auth.users (or handle this differently)
    // For now, we'll try to use a real user or skip user_id validation
    
    const results = {
      inserted: 0,
      errors: [] as string[]
    }

    // Fetch all players to match by name
    const { data: allPlayers, error: playersError } = await supabase
      .from('players')
      .select('id, name, position')

    if (playersError || !allPlayers) {
      return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 })
    }

    // Create a case-insensitive name lookup
    const playerLookup = new Map<string, typeof allPlayers[0]>()
    for (const player of allPlayers) {
      playerLookup.set(player.name.toLowerCase().trim(), player)
    }

    // Process each team
    for (const teamData of teams) {
      try {
        const { team_name, players: playerNames } = teamData

        if (!team_name) {
          results.errors.push(`Team missing name: ${JSON.stringify(teamData)}`)
          continue
        }

        if (!playerNames || !Array.isArray(playerNames) || playerNames.length !== 17) {
          results.errors.push(`Team "${team_name}" must have exactly 17 players, got ${playerNames?.length || 0}`)
          continue
        }

        // Match player names to player IDs
        const matchedPlayers: { player_id: string; position_slot: string }[] = []
        const missingPlayers: string[] = []

        for (let i = 0; i < playerNames.length; i++) {
          const playerName = (playerNames[i] || '').trim()
          if (!playerName) {
            missingPlayers.push(`Slot ${i + 1} (${POSITION_SLOTS[i]})`)
            continue
          }

          const player = playerLookup.get(playerName.toLowerCase())
          if (!player) {
            missingPlayers.push(`${playerName} (Slot: ${POSITION_SLOTS[i]})`)
            continue
          }

          matchedPlayers.push({
            player_id: player.id,
            position_slot: POSITION_SLOTS[i]
          })
        }

        if (missingPlayers.length > 0) {
          results.errors.push(`Team "${team_name}": Missing players - ${missingPlayers.join(', ')}`)
          continue
        }

        // Check if team already exists
        const { data: existingTeam } = await supabase
          .from('fantasy_teams')
          .select('id')
          .eq('team_name', team_name)
          .maybeSingle()

        if (existingTeam) {
          results.errors.push(`Team "${team_name}" already exists`)
          continue
        }

        // For imported teams without auth, we need a user_id
        // Option 1: Create teams with a system user
        // Option 2: Make user_id nullable (requires schema change)
        // Option 3: Create a dummy user for imports
        
        // Let's try to insert with a placeholder UUID and handle RLS
        // First, let's try to get/create a system user
        
        // Actually, let's bypass RLS by using service role or update RLS policies
        // For now, let's insert and see if RLS allows it
        
        // Create the team - use null for user_id if allowed, otherwise use system user ID
        const { data: team, error: teamError } = await supabase
          .from('fantasy_teams')
          .insert({
            user_id: null, // Will use null if column is nullable, otherwise use SYSTEM_USER_ID
            team_name,
            is_locked: true // Imported teams should be locked
          })
          .select()
          .single()

        // If null user_id fails, try with system user ID
        let finalTeam = team
        let finalTeamError = teamError
        if (teamError && (teamError.code === '23502' || teamError.message.includes('null value'))) {
          const { data: teamWithUserId, error: userIdError } = await supabase
            .from('fantasy_teams')
            .insert({
              user_id: SYSTEM_USER_ID,
              team_name,
              is_locked: true
            })
            .select()
            .single()
          finalTeam = teamWithUserId
          finalTeamError = userIdError
        }

        if (finalTeamError) {
          // If it fails due to user_id, we need to handle this differently
          if (finalTeamError.code === '23503' || finalTeamError.message.includes('user_id')) {
            results.errors.push(`Team "${team_name}": Invalid user_id. Please run update-rls-for-teams-no-auth.sql to make user_id nullable or create a system user.`)
          } else {
            results.errors.push(`Team "${team_name}": ${finalTeamError.message}`)
          }
          continue
        }

        // Insert team players
        const teamPlayersData = matchedPlayers.map(p => ({
          fantasy_team_id: finalTeam!.id,
          player_id: p.player_id,
          position_slot: p.position_slot
        }))

        const { error: playersError } = await supabase
          .from('fantasy_team_players')
          .insert(teamPlayersData)

        if (playersError) {
          // Clean up team if players insert fails
          await supabase.from('fantasy_teams').delete().eq('id', finalTeam!.id)
          results.errors.push(`Team "${team_name}": Failed to add players - ${playersError.message}`)
          continue
        }

        results.inserted++
      } catch (error: any) {
        results.errors.push(`Error processing team: ${error.message}`)
      }
    }

    return NextResponse.json({
      inserted: results.inserted,
      errors: results.errors.length > 0 ? results.errors : undefined
    })
  } catch (error: any) {
    console.error('Error in bulk team import:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
