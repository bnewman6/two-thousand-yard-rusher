import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const week = parseInt(searchParams.get('week') || '1')
    
    const apiKey = process.env.SPORTRADAR_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'SportRadar API key not configured',
        apiKey: 'NOT_SET'
      })
    }

    // Test multiple SportRadar API endpoints with different access levels
    const endpoints = [
      // Trial access level
      `https://api.sportradar.com/nfl/official/trial/v7/en/games/2025/REG/${week}/schedule.json?api_key=${apiKey}`,
      `https://api.sportradar.com/nfl/official/trial/v7/en/games/2024/REG/${week}/schedule.json?api_key=${apiKey}`,
      `https://api.sportradar.com/nfl/official/trial/v7/en/games/current_week/schedule.json?api_key=${apiKey}`,
      
      // Production access level
      `https://api.sportradar.com/nfl/official/production/v7/en/games/2025/REG/${week}/schedule.json?api_key=${apiKey}`,
      `https://api.sportradar.com/nfl/official/production/v7/en/games/2024/REG/${week}/schedule.json?api_key=${apiKey}`,
      
      // Simulated access level
      `https://api.sportradar.com/nfl/official/simulation/v7/en/games/2025/REG/${week}/schedule.json?api_key=${apiKey}`,
      
      // Basic endpoint test
      `https://api.sportradar.com/nfl/official/trial/v7/en/leagues.json?api_key=${apiKey}`
    ]

    const results = []
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, { next: { revalidate: 0 } })
        results.push({
          endpoint: endpoint.replace(apiKey, 'API_KEY_HIDDEN'),
          status: response.status,
          success: response.ok,
          data: response.ok ? await response.json() : await response.text()
        })
      } catch (error) {
        results.push({
          endpoint: endpoint.replace(apiKey, 'API_KEY_HIDDEN'),
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    const responseData = {
      success: results.some(r => r.success),
      apiKey: apiKey.substring(0, 8) + '...',
      week,
      results
    }

    return NextResponse.json(responseData)

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      apiKey: process.env.SPORTRADAR_API_KEY ? 'SET' : 'NOT_SET'
    })
  }
}
