import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { season, week } = await request.json()
    
    if (!season || !week) {
      return NextResponse.json({ error: 'Season and week required' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Get all running backs for this week to extract game information
    const { data: runningBacks, error: rbError } = await supabase
      .from('running_backs')
      .select('*')
      .eq('season', season)
      .eq('week', week)

    if (rbError) {
      console.error('Error fetching running backs:', rbError)
      return NextResponse.json({ error: 'Failed to fetch running backs' }, { status: 500 })
    }

    if (!runningBacks || runningBacks.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No running backs found for this week',
        gamesUpdated: 0
      })
    }

    // Group players by game (using team and game_start_time as unique identifier)
    const gameMap = new Map<string, any>()
    
    for (const player of runningBacks) {
      if (!player.game_start_time) continue
      
      const gameKey = `${player.team}-${player.game_start_time}`
      
      if (!gameMap.has(gameKey)) {
        gameMap.set(gameKey, {
          home_team: player.team,
          away_team: player.opponent || 'TBD',
          game_time: player.game_start_time,
          players: []
        })
      }
      
      gameMap.get(gameKey).players.push(player)
    }

    let gamesUpdated = 0
    
    // Insert or update games in the games table
    for (const [gameKey, gameData] of gameMap) {
      // Determine game status based on player lock status
      const hasLockedPlayers = gameData.players.some((p: any) => p.is_locked)
      const status = hasLockedPlayers ? 'inprogress' : 'scheduled'
      
      // Create a unique game_id
      const gameId = `${season}-${week}-${gameData.home_team}-${gameData.away_team}`
      
      // Check if game already exists
      const { data: existingGame } = await supabase
        .from('games')
        .select('*')
        .eq('game_id', gameId)
        .single()

      if (existingGame) {
        // Update existing game
        const { error: updateError } = await supabase
          .from('games')
          .update({
            status,
            updated_at: new Date().toISOString()
          })
          .eq('game_id', gameId)

        if (updateError) {
          console.error(`Error updating game ${gameId}:`, updateError)
        } else {
          gamesUpdated++
        }
      } else {
        // Insert new game
        const { error: insertError } = await supabase
          .from('games')
          .insert({
            game_id: gameId,
            season,
            week,
            home_team: gameData.home_team,
            away_team: gameData.away_team,
            game_time: gameData.game_time,
            status,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (insertError) {
          console.error(`Error inserting game ${gameId}:`, insertError)
        } else {
          gamesUpdated++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${gamesUpdated} games successfully`,
      gamesUpdated,
      totalGames: gameMap.size
    })

  } catch (error) {
    console.error('Error updating games:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
