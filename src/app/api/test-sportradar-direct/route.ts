import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.SPORTRADAR_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'SportRadar API key not configured' }, { status: 500 })
    }

    const SPORTRADAR_API_BASE = 'https://api.sportradar.com/nfl/official/trial/v7/en'
    
    // Test 1: Get current week schedule
    console.log('Testing Sportradar API directly...')
    
    const scheduleResponse = await fetch(
      `${SPORTRADAR_API_BASE}/games/current_week/schedule.json?api_key=${apiKey}`,
      { next: { revalidate: 0 } } // No cache for testing
    )

    if (!scheduleResponse.ok) {
      return NextResponse.json({ 
        error: `Schedule API failed: ${scheduleResponse.status}`,
        status: scheduleResponse.status,
        statusText: scheduleResponse.statusText
      }, { status: 500 })
    }

    const scheduleData = await scheduleResponse.json()
    const games = scheduleData.week?.games || []
    
    console.log(`Found ${games.length} games in schedule`)

    // Find a completed game to test
    const completedGame = games.find((game: any) => game.status === 'closed')
    
    if (!completedGame) {
      return NextResponse.json({
        success: false,
        message: 'No completed games found to test',
        scheduleData: {
          week: scheduleData.week?.number,
          season: scheduleData.week?.season,
          games: games.map((g: any) => ({
            id: g.id,
            status: g.status,
            home: g.home?.alias,
            away: g.away?.alias,
            scheduled: g.scheduled
          }))
        }
      })
    }

    console.log(`Testing with completed game: ${completedGame.id} (${completedGame.home?.alias} vs ${completedGame.away?.alias})`)

    // Test 2: Get game statistics for completed game
    const gameStatsResponse = await fetch(
      `${SPORTRADAR_API_BASE}/games/${completedGame.id}/statistics.json?api_key=${apiKey}`,
      { next: { revalidate: 0 } } // No cache for testing
    )

    if (!gameStatsResponse.ok) {
      return NextResponse.json({ 
        error: `Game stats API failed: ${gameStatsResponse.status}`,
        gameId: completedGame.id,
        status: gameStatsResponse.status,
        statusText: gameStatsResponse.statusText
      }, { status: 500 })
    }

    const gameStats = await gameStatsResponse.json()
    
    // Extract rushing stats
    const homeRushing = gameStats.home?.rushing?.players || []
    const awayRushing = gameStats.away?.rushing?.players || []
    
    const allRushers = [
      ...homeRushing.map((p: any) => ({ ...p, team: 'home' })),
      ...awayRushing.map((p: any) => ({ ...p, team: 'away' }))
    ]

    return NextResponse.json({
      success: true,
      message: 'Sportradar API test successful',
      gameInfo: {
        id: completedGame.id,
        status: completedGame.status,
        home: completedGame.home?.alias,
        away: completedGame.away?.alias,
        scheduled: completedGame.scheduled
      },
      rushingStats: {
        homeTeam: gameStats.home?.alias,
        awayTeam: gameStats.away?.alias,
        homeRushers: homeRushing.length,
        awayRushers: awayRushing.length,
        totalRushers: allRushers.length
      },
      topRushers: allRushers
        .sort((a, b) => (b.yards || 0) - (a.yards || 0))
        .slice(0, 10)
        .map((p: any) => ({
          name: p.name,
          team: p.team,
          yards: p.yards || 0,
          attempts: p.attempts || 0,
          touchdowns: p.touchdowns || 0
        })),
      rawGameStats: {
        home: {
          alias: gameStats.home?.alias,
          rushing: {
            players: homeRushing.slice(0, 3) // First 3 players
          }
        },
        away: {
          alias: gameStats.away?.alias,
          rushing: {
            players: awayRushing.slice(0, 3) // First 3 players
          }
        }
      }
    })

  } catch (error) {
    console.error('Error testing Sportradar API:', error)
    return NextResponse.json({ 
      error: 'Failed to test Sportradar API',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
