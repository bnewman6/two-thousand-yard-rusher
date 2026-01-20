import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get all fantasy teams with their players
    const { data: teams, error: teamsError } = await supabase
      .from('fantasy_teams')
      .select('*')
      .order('created_at', { ascending: false })

    if (teamsError) {
      console.error('Error fetching teams:', teamsError)
      return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
    }

    // Calculate total points for each team
    const leaderboard = await Promise.all(
      (teams || []).map(async (team) => {
        const { data: teamPlayers } = await supabase
          .from('fantasy_team_players')
          .select(`
            *,
            player:players(*)
          `)
          .eq('fantasy_team_id', team.id)

        const totalPoints = (teamPlayers || []).reduce((sum, tp: any) => {
          return sum + (parseFloat(tp.player?.tot_pts || 0))
        }, 0)

        return {
          fantasy_team: team,
          total_points: totalPoints
        }
      })
    )

    // Sort by total points (descending) and add rank
    leaderboard.sort((a, b) => b.total_points - a.total_points)
    const leaderboardWithRank = leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }))

    return NextResponse.json({ leaderboard: leaderboardWithRank })
  } catch (error) {
    console.error('Error in GET /api/playoffs/leaderboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

