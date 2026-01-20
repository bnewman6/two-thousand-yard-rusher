import { createClient } from '@/lib/supabase-server'
import { PlayoffsHeader } from '@/components/playoffs-header'
import { TeamViewClient } from '@/components/playoffs-team-view-client'
import { notFound } from 'next/navigation'

export default async function TeamViewPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id: teamId } = await params

  try {
    // Fetch the team
    const { data: team, error: teamError } = await supabase
      .from('fantasy_teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      notFound()
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
      notFound()
    }

    // Calculate total points
    const totalPoints = (teamPlayers || []).reduce((sum: number, tp: any) => {
      return sum + (parseFloat(tp.player?.tot_pts || 0))
    }, 0)

    // Get rank by fetching all teams and calculating
    const { data: allTeams } = await supabase
      .from('fantasy_teams')
      .select('*')

    let rank: number | null = null
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
      rank = allTeamPoints.findIndex(t => t.team_id === teamId) + 1
    }

    const teamWithData = {
      ...team,
      players: teamPlayers || [],
      total_points: totalPoints,
      rank
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <PlayoffsHeader currentPage="dashboard" />
        <TeamViewClient team={teamWithData} />
      </div>
    )
  } catch (error) {
    console.error('Error loading team:', error)
    notFound()
  }
}
