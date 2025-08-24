import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { GameManager } from '@/lib/game-manager'
import { NFLApiService } from '@/lib/nfl-api'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, season, week, playerId } = body

    const supabase = await createClient()
    const gameManager = GameManager.getInstance()

    switch (action) {
      case 'update_player_locks':
        // Update lock status for all players in a week
        await gameManager.updatePlayerLocks(season, week)
        
        // Update pick game status for all users
        const { data: picks } = await supabase
          .from('weekly_picks')
          .select('user_id')
          .eq('season', season)
          .eq('week', week)

        if (picks) {
          for (const pick of picks) {
            await gameManager.updatePickGameStatus(pick.user_id, season, week)
          }
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Player locks updated successfully' 
        })

      case 'update_player_yards':
        // Update yards for a specific player
        if (!playerId) {
          return NextResponse.json(
            { error: 'Player ID is required' },
            { status: 400 }
          )
        }

        // Get current player data
        const { data: player } = await supabase
          .from('running_backs')
          .select('*')
          .eq('player_id', playerId)
          .eq('season', season)
          .eq('week', week)
          .single()

        if (!player) {
          return NextResponse.json(
            { error: 'Player not found' },
            { status: 404 }
          )
        }

        // Fetch updated stats from NFL API
        const updatedStats = await NFLApiService.getPlayerStats(playerId, season, week)
        
        if (updatedStats && updatedStats.rushingYards !== undefined) {
          // Update player yards
          await supabase
            .from('running_backs')
            .update({
              yards: updatedStats.rushingYards,
              updated_at: new Date().toISOString()
            })
            .eq('id', player.id)

          // Update all picks for this player
          const { data: playerPicks } = await supabase
            .from('weekly_picks')
            .select('*')
            .eq('player_id', playerId)
            .eq('season', season)
            .eq('week', week)

          if (playerPicks) {
            for (const pick of playerPicks) {
              await supabase
                .from('weekly_picks')
                .update({
                  yards_gained: updatedStats.rushingYards,
                  updated_at: new Date().toISOString()
                })
                .eq('id', pick.id)

              // Update user's total yards
              await supabase
                .from('profiles')
                .update({
                  total_yards: supabase.rpc('increment_total_yards', {
                    user_id: pick.user_id,
                    yards_to_add: updatedStats.rushingYards - (pick.yards_gained || 0)
                  })
                })
                .eq('id', pick.user_id)
            }
          }
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Player yards updated successfully',
          yards: updatedStats?.rushingYards || player.yards
        })

      case 'update_week_yards':
        // Update yards for all players in a week
        const { data: weekPlayers } = await supabase
          .from('running_backs')
          .select('*')
          .eq('season', season)
          .eq('week', week)

        if (!weekPlayers) {
          return NextResponse.json({ 
            success: true, 
            message: 'No players found for this week' 
          })
        }

        const updatePromises = weekPlayers.map(async (player) => {
          try {
            const updatedStats = await NFLApiService.getPlayerStats(player.player_id, season, week)
            
            if (updatedStats && updatedStats.rushingYards !== undefined) {
              // Update player yards
              await supabase
                .from('running_backs')
                .update({
                  yards: updatedStats.rushingYards,
                  updated_at: new Date().toISOString()
                })
                .eq('id', player.id)

              // Update picks for this player
              const { data: playerPicks } = await supabase
                .from('weekly_picks')
                .select('*')
                .eq('player_id', player.player_id)
                .eq('season', season)
                .eq('week', week)

              if (playerPicks) {
                for (const pick of playerPicks) {
                  await supabase
                    .from('weekly_picks')
                    .update({
                      yards_gained: updatedStats.rushingYards,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', pick.id)

                  // Update user's total yards
                  await supabase
                    .from('profiles')
                    .update({
                      total_yards: supabase.rpc('increment_total_yards', {
                        user_id: pick.user_id,
                        yards_to_add: updatedStats.rushingYards - (pick.yards_gained || 0)
                      })
                    })
                    .eq('id', pick.user_id)
                }
              }
            }
          } catch (error) {
            console.error(`Error updating player ${player.player_id}:`, error)
          }
        })

        await Promise.all(updatePromises)

        return NextResponse.json({ 
          success: true, 
          message: 'Week yards updated successfully' 
        })

      case 'finalize_week':
        // Mark all picks for a week as finalized
        await supabase
          .from('weekly_picks')
          .update({
            is_finalized: true,
            game_status: 'final',
            updated_at: new Date().toISOString()
          })
          .eq('season', season)
          .eq('week', week)

        return NextResponse.json({ 
          success: true, 
          message: 'Week finalized successfully' 
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in automated updates:', error)
    return NextResponse.json(
      { error: 'Failed to process automated update' },
      { status: 500 }
    )
  }
}

// GET endpoint to check update status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const season = parseInt(searchParams.get('season') || '2023')
    const week = parseInt(searchParams.get('week') || '1')

    const gameManager = GameManager.getInstance()
    
    const hasLiveGames = await gameManager.hasLiveGames(season, week)
    const nextGameTime = await gameManager.getNextGameTime(season, week)

    return NextResponse.json({
      hasLiveGames,
      nextGameTime: nextGameTime?.toISOString(),
      lastUpdate: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error checking update status:', error)
    return NextResponse.json(
      { error: 'Failed to check update status' },
      { status: 500 }
    )
  }
}
