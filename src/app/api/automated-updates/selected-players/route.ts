import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { NFLApiService } from '@/lib/nfl-api'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { season, week } = body

    const supabase = await createClient()

    // Use optimized function to get selected players
    const { data: selectedPlayers, error: selectedError } = await supabase
      .rpc('get_selected_players', { 
        target_season: season, 
        target_week: week 
      })

    if (selectedError) {
      console.error('Error getting selected players:', selectedError)
      return NextResponse.json(
        { error: 'Failed to get selected players' },
        { status: 500 }
      )
    }

    if (!selectedPlayers || selectedPlayers.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No selected players found for this week',
        updatedPlayers: 0
      })
    }

    // Extract unique player IDs
    const uniquePlayerIds = selectedPlayers.map(player => player.player_id)
    
    console.log(`Optimized update: Fetching stats for ${uniquePlayerIds.length} selected players instead of all players`)

    const updatePromises = uniquePlayerIds.map(async (playerId) => {
      try {
        // Fetch updated stats from NFL API for this specific player
        const updatedStats = await NFLApiService.getPlayerStats(playerId, season, week)
        
        if (updatedStats && updatedStats.rushingYards !== undefined) {
          // Update player yards in running_backs table
          await supabase
            .from('running_backs')
            .update({
              yards: updatedStats.rushingYards,
              updated_at: new Date().toISOString()
            })
            .eq('player_id', playerId)
            .eq('season', season)
            .eq('week', week)

          // Update all picks for this player
          const playerPicks = selectedPicks.filter(pick => pick.player_id === playerId)
          
          for (const pick of playerPicks) {
            const oldYards = pick.yards_gained || 0
            const newYards = updatedStats.rushingYards
            
            // Update pick yards
            await supabase
              .from('weekly_picks')
              .update({
                yards_gained: newYards,
                updated_at: new Date().toISOString()
              })
              .eq('player_id', playerId)
              .eq('user_id', pick.user_id)
              .eq('season', season)
              .eq('week', week)

            // Update user's total yards (only if yards changed)
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
          
          return { playerId, yards: updatedStats.rushingYards, picksUpdated: playerPicks.length }
        }
      } catch (error) {
        console.error(`Error updating selected player ${playerId}:`, error)
        return { playerId, error: error.message }
      }
    })

    const results = await Promise.all(updatePromises)
    const successfulUpdates = results.filter(result => result && !result.error)
    const failedUpdates = results.filter(result => result && result.error)

    return NextResponse.json({ 
      success: true, 
      message: `Optimized update: Updated ${successfulUpdates.length} selected players`,
      updatedPlayers: successfulUpdates.length,
      failedPlayers: failedUpdates.length,
      totalApiCalls: uniquePlayerIds.length,
      totalUsersAffected: selectedPlayers.reduce((sum, player) => sum + Number(player.user_count), 0),
      totalPicksAffected: selectedPlayers.reduce((sum, player) => sum + Number(player.total_picks), 0),
      results: successfulUpdates
    })

  } catch (error) {
    console.error('Error in optimized selected players update:', error)
    return NextResponse.json(
      { error: 'Failed to update selected players' },
      { status: 500 }
    )
  }
}
