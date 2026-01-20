import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { NFLApiService } from '@/lib/nfl-api'

export async function POST(request: NextRequest) {
  try {
    const { playerId, playerName } = await request.json()
    
    if (!playerId) {
      return NextResponse.json({ error: 'Player ID required' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Get current week and season
    const { week, season } = NFLApiService.getCurrentWeekAndSeason()
    
    console.log(`Testing live stats for player ${playerId} (${playerName}) in Week ${week}`)
    
    // Fetch live stats from NFL API
    const liveStats = await NFLApiService.getPlayerStats(playerId, season, week)
    
    console.log('Live stats result:', liveStats)
    
    if (liveStats && liveStats.rushingYards !== undefined) {
      // Update player in database
      const { error: updateError } = await supabase
        .from('running_backs')
        .update({
          yards: liveStats.rushingYards,
          updated_at: new Date().toISOString()
        })
        .eq('player_id', playerId)
        .eq('season', season)
        .eq('week', week)

      if (updateError) {
        console.error('Error updating player:', updateError)
        return NextResponse.json({ error: 'Failed to update player' }, { status: 500 })
      }

      // Update picks for this player
      const { data: picks, error: picksError } = await supabase
        .from('weekly_picks')
        .select('*')
        .eq('player_id', playerId)
        .eq('season', season)
        .eq('week', week)

      if (picksError) {
        console.error('Error fetching picks:', picksError)
        return NextResponse.json({ error: 'Failed to fetch picks' }, { status: 500 })
      }

      // Update each pick
      for (const pick of picks || []) {
        const oldYards = pick.yards_gained || 0
        const newYards = liveStats.rushingYards
        
        await supabase
          .from('weekly_picks')
          .update({
            yards_gained: newYards,
            updated_at: new Date().toISOString()
          })
          .eq('id', pick.id)

        // Update user's total yards if changed
        if (newYards !== oldYards) {
          await supabase
            .from('profiles')
            .update({
              total_yards: supabase.rpc('increment_total_yards', {
                user_id: pick.user_id,
                yards_to_add: newYards - oldYards
              })
            })
            .eq('id', pick.user_id)
        }
      }

      return NextResponse.json({
        success: true,
        playerId,
        playerName,
        liveStats,
        picksUpdated: picks?.length || 0,
        message: `Updated ${playerName} to ${liveStats.rushingYards} yards`
      })
    } else {
      return NextResponse.json({
        success: false,
        playerId,
        playerName,
        message: 'No live stats available - game may not be live or player not found',
        liveStats
      })
    }
  } catch (error) {
    console.error('Error testing live stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
