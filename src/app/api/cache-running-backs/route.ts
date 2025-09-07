import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { NFLApiService } from '@/lib/nfl-api'

export async function POST(request: NextRequest) {
  try {
    const { season, week } = await request.json()
    
    if (!season || !week) {
      return NextResponse.json({ error: 'Season and week required' }, { status: 400 })
    }

    const supabase = await createClient()
    
    console.log(`Caching running backs for Season ${season}, Week ${week}`)
    
    // Fetch running backs from NFL API
    const runningBacks = await NFLApiService.getCurrentWeekRunningBacks(week, season)
    
    if (!runningBacks || runningBacks.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No running backs found from NFL API' 
      })
    }

    let cached = 0
    let updated = 0
    let errors = 0

    // Cache each running back in the database
    for (const player of runningBacks) {
      try {
        // Check if player already exists
        const { data: existingPlayer } = await supabase
          .from('running_backs')
          .select('*')
          .eq('player_id', player.player_id)
          .eq('season', season)
          .eq('week', week)
          .single()

        if (existingPlayer) {
          // Update existing player
          const { error: updateError } = await supabase
            .from('running_backs')
            .update({
              name: player.name,
              team: player.team,
              yards: player.yards || 0,
              games_played: player.games_played || 1,
              is_locked: player.is_locked || false,
              game_start_time: player.game_start_time === 'Final' ? null : player.game_start_time,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingPlayer.id)

          if (updateError) {
            console.error(`Error updating player ${player.name}:`, updateError)
            errors++
          } else {
            updated++
          }
        } else {
          // Insert new player
          const { error: insertError } = await supabase
            .from('running_backs')
            .insert({
              player_id: player.player_id,
              name: player.name,
              team: player.team,
              position: 'RB',
              season,
              week,
              yards: player.yards || 0,
              games_played: player.games_played || 1,
              is_locked: player.is_locked || false,
              game_start_time: player.game_start_time === 'Final' ? null : player.game_start_time,
              updated_at: new Date().toISOString()
            })

          if (insertError) {
            console.error(`Error inserting player ${player.name}:`, insertError)
            errors++
          } else {
            cached++
          }
        }
      } catch (error) {
        console.error(`Error processing player ${player.name}:`, error)
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cached ${cached} new players, updated ${updated} existing players`,
      stats: {
        total: runningBacks.length,
        cached,
        updated,
        errors
      }
    })

  } catch (error) {
    console.error('Error caching running backs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
