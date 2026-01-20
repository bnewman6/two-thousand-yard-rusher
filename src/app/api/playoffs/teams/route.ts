import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { areTeamsLocked, validateTeamComposition, getNonFlexSlots } from '@/lib/playoffs-utils'

// GET - Get fantasy teams (optionally filtered by user_id)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const includePlayers = searchParams.get('include_players') === 'true'

    let query = supabase
      .from('fantasy_teams')
      .select('*')

    if (userId) {
      query = query.eq('user_id', userId)
    }

    query = query.order('created_at', { ascending: false })

    const { data: teams, error } = await query

    if (error) {
      console.error('Error fetching fantasy teams:', error)
      return NextResponse.json({ error: 'Failed to fetch fantasy teams' }, { status: 500 })
    }

    if (includePlayers && teams) {
      // Fetch players for each team
      const teamsWithPlayers = await Promise.all(
        (teams || []).map(async (team) => {
          const { data: teamPlayers } = await supabase
            .from('fantasy_team_players')
            .select(`
              *,
              player:players(*)
            `)
            .eq('fantasy_team_id', team.id)

          // Calculate total points
          const totalPoints = (teamPlayers || []).reduce((sum, tp: any) => {
            return sum + (parseFloat(tp.player?.tot_pts || 0))
          }, 0)

          return {
            ...team,
            players: teamPlayers || [],
            total_points: totalPoints
          }
        })
      )

      return NextResponse.json({ teams: teamsWithPlayers })
    }

    return NextResponse.json({ teams: teams || [] })
  } catch (error) {
    console.error('Error in GET /api/playoffs/teams:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new fantasy team
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    const body = await request.json()
    const { team_name, players } = body

    if (!team_name) {
      return NextResponse.json({ error: 'Team name required' }, { status: 400 })
    }

    if (!players || !Array.isArray(players)) {
      return NextResponse.json({ error: 'Players array required' }, { status: 400 })
    }

    // Validate team composition
    // First, fetch full player data
    const playerIds = players.map((p: any) => p.player_id)
    const { data: playerData } = await supabase
      .from('players')
      .select('*')
      .in('id', playerIds)

    if (!playerData || playerData.length !== players.length) {
      return NextResponse.json({ error: 'Invalid player IDs' }, { status: 400 })
    }

    const teamPlayers = players.map((p: any) => ({
      position_slot: p.position_slot,
      player: playerData.find(pd => pd.id === p.player_id)!
    }))

    const validation = validateTeamComposition(teamPlayers)
    if (!validation.valid) {
      return NextResponse.json({ error: 'Invalid team composition', errors: validation.errors }, { status: 400 })
    }

    // Create the team
    const { data: team, error: teamError } = await supabase
      .from('fantasy_teams')
      .insert({
        user_id: user?.id || null,
        team_name,
        is_locked: true
      })
      .select()
      .single()

    if (teamError) {
      console.error('Error creating fantasy team:', teamError)
      return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
    }

    // Insert team players
    const teamPlayersData = players.map((p: any) => ({
      fantasy_team_id: team.id,
      player_id: p.player_id,
      position_slot: p.position_slot
    }))

    const { error: playersError } = await supabase
      .from('fantasy_team_players')
      .insert(teamPlayersData)

    if (playersError) {
      console.error('Error creating team players:', playersError)
      // Clean up team if players insert fails
      await supabase.from('fantasy_teams').delete().eq('id', team.id)
      return NextResponse.json({ error: 'Failed to create team players' }, { status: 500 })
    }

    return NextResponse.json({ team }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/playoffs/teams:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update a fantasy team
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // Check if teams are locked
    if (areTeamsLocked()) {
      return NextResponse.json({ error: 'Teams are locked. Cannot edit teams.' }, { status: 403 })
    }

    const body = await request.json()
    const { id, team_name, players } = body

    if (!id) {
      return NextResponse.json({ error: 'Team ID required' }, { status: 400 })
    }

    // Verify team belongs to user
    const { data: existingTeam } = await supabase
      .from('fantasy_teams')
      .select('*')
      .eq('id', id)
      .eq('user_id', user?.id || null)
      .single()

    if (!existingTeam) {
      return NextResponse.json({ error: 'Team not found or unauthorized' }, { status: 404 })
    }

    // Update team name if provided
    if (team_name !== undefined) {
      const { error: updateError } = await supabase
        .from('fantasy_teams')
        .update({ team_name })
        .eq('id', id)

      if (updateError) {
        console.error('Error updating team name:', updateError)
        return NextResponse.json({ error: 'Failed to update team' }, { status: 500 })
      }
    }

    // Update players if provided
    if (players && Array.isArray(players)) {
      // Validate team composition
      const playerIds = players.map((p: any) => p.player_id)
      const { data: playerData } = await supabase
        .from('players')
        .select('*')
        .in('id', playerIds)

      if (!playerData || playerData.length !== players.length) {
        return NextResponse.json({ error: 'Invalid player IDs' }, { status: 400 })
      }

      const teamPlayers = players.map((p: any) => ({
        position_slot: p.position_slot,
        player: playerData.find(pd => pd.id === p.player_id)!
      }))

      const validation = validateTeamComposition(teamPlayers)
      if (!validation.valid) {
        return NextResponse.json({ error: 'Invalid team composition', errors: validation.errors }, { status: 400 })
      }

      // Delete existing players
      const { error: deleteError } = await supabase
        .from('fantasy_team_players')
        .delete()
        .eq('fantasy_team_id', id)

      if (deleteError) {
        console.error('Error deleting team players:', deleteError)
        return NextResponse.json({ error: 'Failed to update team players' }, { status: 500 })
      }

      // Insert new players
      const teamPlayersData = players.map((p: any) => ({
        fantasy_team_id: id,
        player_id: p.player_id,
        position_slot: p.position_slot
      }))

      const { error: insertError } = await supabase
        .from('fantasy_team_players')
        .insert(teamPlayersData)

      if (insertError) {
        console.error('Error inserting team players:', insertError)
        return NextResponse.json({ error: 'Failed to update team players' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PUT /api/playoffs/teams:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a fantasy team
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('id')

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID required' }, { status: 400 })
    }

    // Delete team (cascade will delete team players)
    const { error: deleteError } = await supabase
      .from('fantasy_teams')
      .delete()
      .eq('id', teamId)

    if (deleteError) {
      console.error('Error deleting team:', deleteError)
      return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/playoffs/teams:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
