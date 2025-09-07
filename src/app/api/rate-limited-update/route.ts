import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { NFLApiService } from '@/lib/nfl-api'
import { sportradarRateLimiter } from '@/lib/rate-limiter'

export async function POST(request: NextRequest) {
  try {
    const { season, week, playerId } = await request.json()
    
    if (!season || !week) {
      return NextResponse.json({ error: 'Season and week required' }, { status: 400 })
    }

    const supabase = await createClient()
    
    console.log(`Rate-limited update for Season ${season}, Week ${week}`)
    
    // Get rate limiter status
    const rateLimitStatus = sportradarRateLimiter.getStatus()
    console.log('Rate limiter status:', rateLimitStatus)
    
    // If we're already at high usage, wait
    if (rateLimitStatus.requestsLastMinute >= 8) {
      return NextResponse.json({
        success: false,
        message: 'Rate limit approaching, please wait',
        rateLimitStatus,
        retryAfter: 60 // seconds
      })
    }

    let updatedPlayers = 0
    let errors = 0
    const results = []

    if (playerId) {
      // Update specific player
      try {
        console.log(`Updating specific player: ${playerId}`)
        const updatedStats = await NFLApiService.getPlayerStats(playerId, season, week)
        
        if (updatedStats && updatedStats.rushingYards !== undefined) {
          // Update player in database
          await supabase
            .from('running_backs')
            .update({
              yards: updatedStats.rushingYards,
              updated_at: new Date().toISOString()
            })
            .eq('player_id', playerId)
            .eq('season', season)
            .eq('week', week)

          // Update picks for this player
          const { data: picks } = await supabase
            .from('weekly_picks')
            .select('*')
            .eq('player_id', playerId)
            .eq('season', season)
            .eq('week', week)

          if (picks) {
            for (const pick of picks) {
              const oldYards = pick.yards_gained || 0
              const newYards = updatedStats.rushingYards
              
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
          }
          
          updatedPlayers++
          results.push({
            playerId,
            yards: updatedStats.rushingYards,
            picksUpdated: picks?.length || 0
          })
        }
      } catch (error) {
        console.error(`Error updating player ${playerId}:`, error)
        errors++
      }
    } else {
      // Update only selected players (those with picks) to minimize API calls
      const { data: selectedPicks } = await supabase
        .from('weekly_picks')
        .select('player_id')
        .eq('season', season)
        .eq('week', week)
        .eq('is_finalized', false)

      if (!selectedPicks || selectedPicks.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No selected players to update',
          updatedPlayers: 0,
          rateLimitStatus
        })
      }

      // Get unique player IDs
      const uniquePlayerIds = [...new Set(selectedPicks.map(pick => pick.player_id))]
      
      console.log(`Updating ${uniquePlayerIds.length} selected players (instead of all 118)`)

      // Update each selected player with rate limiting
      for (const playerId of uniquePlayerIds) {
        try {
          // Check rate limit before each request
          const currentStatus = sportradarRateLimiter.getStatus()
          if (currentStatus.requestsLastMinute >= 8) {
            console.log('Rate limit reached, stopping updates')
            break
          }

          const updatedStats = await NFLApiService.getPlayerStats(playerId, season, week)
          
          if (updatedStats && updatedStats.rushingYards !== undefined) {
            // Update player in database
            await supabase
              .from('running_backs')
              .update({
                yards: updatedStats.rushingYards,
                updated_at: new Date().toISOString()
              })
              .eq('player_id', playerId)
              .eq('season', season)
              .eq('week', week)

            // Update picks for this player
            const playerPicks = selectedPicks.filter(pick => pick.player_id === playerId)
            
            for (const pick of playerPicks) {
              await supabase
                .from('weekly_picks')
                .update({
                  yards_gained: updatedStats.rushingYards,
                  updated_at: new Date().toISOString()
                })
                .eq('player_id', playerId)
                .eq('user_id', pick.user_id)
                .eq('season', season)
                .eq('week', week)

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
            
            updatedPlayers++
            results.push({
              playerId,
              yards: updatedStats.rushingYards,
              picksUpdated: playerPicks.length
            })
          }
        } catch (error) {
          console.error(`Error updating player ${playerId}:`, error)
          errors++
        }
      }
    }

    const finalRateLimitStatus = sportradarRateLimiter.getStatus()

    return NextResponse.json({
      success: true,
      message: `Rate-limited update completed: ${updatedPlayers} players updated, ${errors} errors`,
      updatedPlayers,
      errors,
      results,
      rateLimitStatus: finalRateLimitStatus
    })

  } catch (error) {
    console.error('Error in rate-limited update:', error)
    return NextResponse.json({ 
      error: 'Failed to perform rate-limited update',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
