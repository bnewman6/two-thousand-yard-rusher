import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// GET - Get a single team with players and rank
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: teamId } = await params

    // Fetch the team
    const { data: team, error: teamError } = await supabase
      .from('fantasy_teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Fetch team players with player data
    const { data: teamPlayers, error: playersError } = await supabase
      .from('fantasy_team_players')
      .select(`
        *,
        player:players(*)
      `)
      .eq('fantasy_team_id', teamId)
      .order('position_slot', { ascending: true })

    if (playersError) {
      console.error('Error fetching team players:', playersError)
      return NextResponse.json({ error: 'Failed to fetch team players' }, { status: 500 })
    }

    // Calculate total points
    const totalPoints = (teamPlayers || []).reduce((sum, tp: any) => {
      return sum + (parseFloat(tp.player?.tot_pts || 0))
    }, 0)

    // Get rank by fetching all teams and calculating
    const { data: allTeams } = await supabase
      .from('fantasy_teams')
      .select('*')

    if (allTeams) {
      const allTeamPoints = await Promise.all(
        allTeams.map(async (t) => {
          const { data: tp } = await supabase
            .from('fantasy_team_players')
            .select(`
              *,
              player:players(*)
            `)
            .eq('fantasy_team_id', t.id)

          const points = (tp || []).reduce((sum: number, tpItem: any) => {
            return sum + (parseFloat(tpItem.player?.tot_pts || 0))
          }, 0)

          return { team_id: t.id, points }
        })
      )

      allTeamPoints.sort((a, b) => b.points - a.points)
      const rank = allTeamPoints.findIndex(t => t.team_id === teamId) + 1

      return NextResponse.json({
        team: {
          ...team,
          players: teamPlayers || [],
          total_points: totalPoints,
          rank
        }
      })
    }

    return NextResponse.json({
      team: {
        ...team,
        players: teamPlayers || [],
        total_points: totalPoints,
        rank: null
      }
    })
  } catch (error) {
    console.error('Error in GET /api/playoffs/teams/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
