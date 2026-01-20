import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { sportradarRateLimiter } from '@/lib/rate-limiter'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const week = parseInt(searchParams.get('week') || '1')
    const season = parseInt(searchParams.get('season') || '2025')
    
    const supabase = await createClient()
    
    console.log(`Getting completed game stats for Season ${season}, Week ${week}`)
    
    // Get rate limiter status
    const rateLimitStatus = sportradarRateLimiter.getStatus()
    console.log('Rate limiter status:', rateLimitStatus)
    
    // If we're at high usage, return status
    if (rateLimitStatus.requestsLastMinute >= 8) {
      return NextResponse.json({
        success: false,
        message: 'Rate limit approaching, please wait',
        rateLimitStatus,
        retryAfter: 60
      })
    }

    const apiKey = process.env.SPORTRADAR_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'SportRadar API key not configured' }, { status: 500 })
    }

    const SPORTRADAR_API_BASE = 'https://api.sportradar.com/nfl/official/trial/v7/en'
    
    // Get schedule with rate limiting
    const scheduleResponse = await sportradarRateLimiter.executeRequest(async () => {
      return fetch(
        `${SPORTRADAR_API_BASE}/games/current_week/schedule.json?api_key=${apiKey}`,
        { next: { revalidate: 3600 } }
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
    
    // Find completed games
    const completedGames = games.filter((game: any) => game.status === 'closed')
    
    console.log(`Found ${completedGames.length} completed games`)

    if (completedGames.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No completed games found',
        completedGames: 0,
        rateLimitStatus: sportradarRateLimiter.getStatus()
      })
    }

    const gameStatsResults = []
    const allRushers = []

    // Get stats for each completed game (with rate limiting)
    for (const game of completedGames.slice(0, 2)) { // Limit to 2 games to respect rate limits
      try {
        console.log(`Getting stats for game: ${game.id} (${game.home?.alias} vs ${game.away?.alias})`)
        
        const gameStatsResponse = await sportradarRateLimiter.executeRequest(async () => {
          return fetch(
            `${SPORTRADAR_API_BASE}/games/${game.id}/statistics.json?api_key=${apiKey}`,
            { next: { revalidate: 0 } } // No cache for testing
          )
        })

        if (gameStatsResponse.ok) {
          const gameStats = await gameStatsResponse.json()
          
          const homeRushing = gameStats.statistics?.home?.rushing?.players || []
          const awayRushing = gameStats.statistics?.away?.rushing?.players || []
          
          const gameRushers = [
            ...homeRushing.map((p: any) => ({ ...p, team: gameStats.statistics?.home?.alias, gameId: game.id })),
            ...awayRushing.map((p: any) => ({ ...p, team: gameStats.statistics?.away?.alias, gameId: game.id }))
          ]

          gameStatsResults.push({
            gameId: game.id,
            home: gameStats.statistics?.home?.alias,
            away: gameStats.statistics?.away?.alias,
            homeRushers: homeRushing.length,
            awayRushers: awayRushing.length,
            rushers: gameRushers.map((p: any) => ({
              name: p.name,
              team: p.team,
              yards: p.yards || 0,
              attempts: p.attempts || 0,
              touchdowns: p.touchdowns || 0
            }))
          })

          allRushers.push(...gameRushers)
        } else {
          console.error(`Failed to get stats for game ${game.id}: ${gameStatsResponse.status}`)
        }
      } catch (error) {
        console.error(`Error getting stats for game ${game.id}:`, error)
      }
    }

    // Sort all rushers by yards
    const topRushers = allRushers
      .sort((a, b) => (b.yards || 0) - (a.yards || 0))
      .slice(0, 20)
      .map((p: any) => ({
        name: p.name,
        team: p.team,
        yards: p.yards || 0,
        attempts: p.attempts || 0,
        touchdowns: p.touchdowns || 0
      }))

    const finalRateLimitStatus = sportradarRateLimiter.getStatus()

    return NextResponse.json({
      success: true,
      message: `Retrieved stats from ${gameStatsResults.length} completed games`,
      summary: {
        completedGames: completedGames.length,
        gamesProcessed: gameStatsResults.length,
        totalRushers: allRushers.length,
        topRushers: topRushers.length
      },
      gameStats: gameStatsResults,
      topRushers,
      rateLimitStatus: finalRateLimitStatus
    })

  } catch (error) {
    console.error('Error getting completed game stats:', error)
    return NextResponse.json({ 
      error: 'Failed to get completed game stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
