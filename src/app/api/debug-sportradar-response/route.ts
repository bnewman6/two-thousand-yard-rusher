import { NextRequest, NextResponse } from 'next/server'
import { sportradarRateLimiter } from '@/lib/rate-limiter'

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.SPORTRADAR_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'SportRadar API key not configured' }, { status: 500 })
    }

    const SPORTRADAR_API_BASE = 'https://api.sportradar.com/nfl/official/trial/v7/en'
    
    // Get schedule first
    const scheduleResponse = await sportradarRateLimiter.executeRequest(async () => {
      return fetch(
        `${SPORTRADAR_API_BASE}/games/current_week/schedule.json?api_key=${apiKey}`,
        { next: { revalidate: 0 } }
      )
    })

    if (!scheduleResponse.ok) {
      return NextResponse.json({ 
        error: `Schedule API failed: ${scheduleResponse.status}`,
        status: scheduleResponse.status
      }, { status: 500 })
    }

    const scheduleData = await scheduleResponse.json()
    const games = scheduleData.week?.games || []
    
    // Find first completed game
    const completedGame = games.find((game: any) => game.status === 'closed')
    
    if (!completedGame) {
      return NextResponse.json({
        success: false,
        message: 'No completed games found',
        availableGames: games.map((g: any) => ({
          id: g.id,
          status: g.status,
          home: g.home?.alias,
          away: g.away?.alias,
          scheduled: g.scheduled
        }))
      })
    }

    console.log(`Debugging game: ${completedGame.id} (${completedGame.home?.alias} vs ${completedGame.away?.alias})`)

    // Get raw game statistics
    const gameStatsResponse = await sportradarRateLimiter.executeRequest(async () => {
      return fetch(
        `${SPORTRADAR_API_BASE}/games/${completedGame.id}/statistics.json?api_key=${apiKey}`,
        { next: { revalidate: 0 } }
      )
    })

    if (!gameStatsResponse.ok) {
      return NextResponse.json({ 
        error: `Game stats API failed: ${gameStatsResponse.status}`,
        gameId: completedGame.id,
        status: gameStatsResponse.status
      }, { status: 500 })
    }

    const gameStats = await gameStatsResponse.json()

    return NextResponse.json({
      success: true,
      message: 'Raw Sportradar API response',
      gameInfo: {
        id: completedGame.id,
        status: completedGame.status,
        home: completedGame.home?.alias,
        away: completedGame.away?.alias,
        scheduled: completedGame.scheduled
      },
      rawResponse: {
        // Show structure of the response
        hasHome: !!gameStats.home,
        hasAway: !!gameStats.away,
        hasStatistics: !!gameStats.statistics,
        homeKeys: gameStats.home ? Object.keys(gameStats.home) : [],
        awayKeys: gameStats.away ? Object.keys(gameStats.away) : [],
        statisticsKeys: gameStats.statistics ? Object.keys(gameStats.statistics) : [],
        homeRushing: gameStats.home?.rushing,
        awayRushing: gameStats.away?.rushing,
        // Show first few keys of the full response
        fullResponseKeys: Object.keys(gameStats)
      },
      // Show a sample of the actual data
      sampleData: {
        home: gameStats.home ? {
          alias: gameStats.home.alias,
          rushing: gameStats.home.rushing
        } : null,
        away: gameStats.away ? {
          alias: gameStats.away.alias,
          rushing: gameStats.away.rushing
        } : null,
        statistics: gameStats.statistics ? {
          home: gameStats.statistics.home ? {
            alias: gameStats.statistics.home.alias,
            rushing: gameStats.statistics.home.rushing
          } : null,
          away: gameStats.statistics.away ? {
            alias: gameStats.statistics.away.alias,
            rushing: gameStats.statistics.away.rushing
          } : null
        } : null
      },
      rateLimitStatus: sportradarRateLimiter.getStatus()
    })

  } catch (error) {
    console.error('Error debugging Sportradar response:', error)
    return NextResponse.json({ 
      error: 'Failed to debug Sportradar response',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
