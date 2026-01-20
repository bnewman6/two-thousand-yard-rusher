import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { NFLApiService } from '@/lib/nfl-api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const week = parseInt(searchParams.get('week') || '1')
    const season = parseInt(searchParams.get('season') || '2025')

    console.log(`Getting live game stats for Week ${week}, Season ${season}`)

    const supabase = await createClient()

    // Get running backs from in-progress games
    const { data: runningBacks, error: rbError } = await supabase
      .from('running_backs')
      .select('*')
      .eq('season', season)
      .eq('week', week)

    if (rbError) {
      console.error('Error fetching running backs:', rbError)
      return NextResponse.json({ success: false, error: 'Failed to fetch running backs' }, { status: 500 })
    }

    if (!runningBacks || runningBacks.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No running backs found for this week',
        liveRushers: []
      })
    }

    // Get games that are in progress
    const { data: liveGames, error: gamesError } = await supabase
      .from('games')
      .select('*')
      .eq('season', season)
      .eq('week', week)
      .eq('status', 'inprogress')

    if (gamesError) {
      console.error('Error fetching live games:', gamesError)
      return NextResponse.json({ success: false, error: 'Failed to fetch live games' }, { status: 500 })
    }

    if (!liveGames || liveGames.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No live games found',
        liveRushers: []
      })
    }

    console.log(`Found ${liveGames.length} live games`)

    const liveRushers: Array<{
      name: string
      team: string
      yards: number
      attempts: number
      touchdowns: number
      gameId: string
      gameStatus: string
      lastUpdated: string
    }> = []

    // Process each live game
    for (const game of liveGames) {
      try {
        console.log(`Getting stats for game: ${game.id}`)
        
        const gameStats = await NFLApiService.getPlayerStats(game.id, season, week)
        
        if (gameStats && gameStats.statistics) {
          // Get home team rushers
          if (gameStats.statistics.home?.rushing?.players) {
            for (const player of gameStats.statistics.home.rushing.players) {
              if (player.yards > 0) { // Only show players with rushing yards
                liveRushers.push({
                  name: player.name,
                  team: gameStats.statistics?.home?.alias || 'UNK',
                  yards: player.yards,
                  attempts: player.attempts,
                  touchdowns: player.touchdowns,
                  gameId: game.id,
                  gameStatus: game.status,
                  lastUpdated: new Date().toISOString()
                })
              }
            }
          }

          // Get away team rushers
          if (gameStats.statistics.away?.rushing?.players) {
            for (const player of gameStats.statistics.away.rushing.players) {
              if (player.yards > 0) { // Only show players with rushing yards
                liveRushers.push({
                  name: player.name,
                  team: gameStats.statistics?.away?.alias || 'UNK',
                  yards: player.yards,
                  attempts: player.attempts,
                  touchdowns: player.touchdowns,
                  gameId: game.id,
                  gameStatus: game.status,
                  lastUpdated: new Date().toISOString()
                })
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error getting stats for game ${game.id}:`, error)
        // Continue with other games even if one fails
      }
    }

    // Sort by yards descending
    liveRushers.sort((a, b) => b.yards - a.yards)

    console.log(`Found ${liveRushers.length} live rushers`)

    return NextResponse.json({
      success: true,
      liveRushers,
      gameCount: liveGames.length,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in get-live-game-stats:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
