import { NextRequest, NextResponse } from 'next/server'
import { NFLApiService } from '@/lib/nfl-api'

/**
 * NFL Running Backs API
 * 
 * Usage:
 * - GET /api/nfl/running-backs - Get current week running backs
 * - GET /api/nfl/running-backs?week=1&season=2025 - Get specific week running backs
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const weekParam = searchParams.get('week')
    const seasonParam = searchParams.get('season')
    
    // Use provided parameters or fall back to current week/season
    const week = weekParam ? parseInt(weekParam) : NFLApiService.getCurrentWeekAndSeason().week
    const season = seasonParam ? parseInt(seasonParam) : NFLApiService.getCurrentWeekAndSeason().season
    
    // Get running backs for specified week
    const runningBacks = await NFLApiService.getCurrentWeekRunningBacks(week, season)
    
    return NextResponse.json({
      week,
      season,
      runningBacks
    })
  } catch (error) {
    console.error('Error fetching running backs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch running backs' },
      { status: 500 }
    )
  }
}