import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { NFLApiService } from '@/lib/nfl-api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const week = parseInt(searchParams.get('week') || '1')
    const season = parseInt(searchParams.get('season') || '2025')
    
    const supabase = await createClient()
    
    console.log(`Verifying real data for Season ${season}, Week ${week}`)
    
    // Get all running backs from NFL API
    const runningBacks = await NFLApiService.getCurrentWeekRunningBacks(week, season)
    
    if (!runningBacks || runningBacks.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No running backs found from NFL API' 
      })
    }

    // Filter to only players with rushing attempts (yards > 0 or attempts > 0)
    const playersWithStats = runningBacks.filter(player => 
      (player.yards && player.yards > 0) || 
      (player.games_played && player.games_played > 0)
    )

    // Sort by yards descending
    const topRushers = playersWithStats
      .sort((a, b) => (b.yards || 0) - (a.yards || 0))
      .slice(0, 20) // Top 20 rushers

    // Get completed games info
    const completedGames = runningBacks
      .filter(player => player.game_start_time === 'Final')
      .reduce((acc, player) => {
        const gameKey = `${player.team} vs ${player.opponent}`
        if (!acc[gameKey]) {
          acc[gameKey] = {
            teams: `${player.team} vs ${player.opponent}`,
            players: []
          }
        }
        if (player.yards && player.yards > 0) {
          acc[gameKey].players.push({
            name: player.name,
            team: player.team,
            yards: player.yards,
            is_locked: player.is_locked
          })
        }
        return acc
      }, {} as Record<string, any>)

    // Get live games info
    const liveGames = runningBacks
      .filter(player => 
        player.game_start_time !== 'Final' && 
        player.is_locked && 
        typeof player.game_start_time === 'string' &&
        !player.game_start_time.includes('Final')
      )
      .reduce((acc, player) => {
        const gameKey = `${player.team} vs ${player.opponent}`
        if (!acc[gameKey]) {
          acc[gameKey] = {
            teams: `${player.team} vs ${player.opponent}`,
            gameTime: player.game_start_time,
            players: []
          }
        }
        acc[gameKey].players.push({
          name: player.name,
          team: player.team,
          yards: player.yards || 0,
          is_locked: player.is_locked
        })
        return acc
      }, {} as Record<string, any>)

    return NextResponse.json({
      success: true,
      message: `Real data verification for Week ${week}`,
      summary: {
        totalPlayers: runningBacks.length,
        playersWithStats: playersWithStats.length,
        completedGames: Object.keys(completedGames).length,
        liveGames: Object.keys(liveGames).length
      },
      topRushers: topRushers.map(player => ({
        name: player.name,
        team: player.team,
        yards: player.yards || 0,
        gameTime: player.game_start_time,
        is_locked: player.is_locked
      })),
      completedGames,
      liveGames,
      rawData: {
        samplePlayers: runningBacks.slice(0, 5).map(p => ({
          name: p.name,
          team: p.team,
          yards: p.yards,
          gameTime: p.game_start_time,
          is_locked: p.is_locked
        }))
      }
    })

  } catch (error) {
    console.error('Error verifying real data:', error)
    return NextResponse.json({ 
      error: 'Failed to verify real data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
