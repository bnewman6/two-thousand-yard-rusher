import { NextRequest, NextResponse } from 'next/server'
import { NFLApiService } from '@/lib/nfl-api'

/**
 * Search API for running backs
 * 
 * Usage:
 * - GET /api/running-backs/search?week=1&season=2025 - Get RB1s from depth charts
 * - GET /api/running-backs/search?q=saquon&week=1&season=2025 - Search all RBs
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const week = parseInt(searchParams.get('week') || '1')
    const season = parseInt(searchParams.get('season') || '2025')
    const timezone = searchParams.get('timezone') || undefined

    // Get running backs based on whether this is a search or main list request
    let allRunningBacks
    if (query.trim()) {
      // For search queries, get all running backs (locked and unlocked)
      allRunningBacks = await NFLApiService.getAllRunningBacksForSearch(week, season, timezone)
    } else {
      // For main list (no search query), get RB1s from depth charts (both locked and unlocked)
      allRunningBacks = await NFLApiService.fetchRunningBacksFromDepthCharts(week, timezone)
    }

    // Filter by search query if provided
    let filteredRunningBacks = allRunningBacks
    if (query.trim()) {
      const searchTerm = query.toLowerCase()
      filteredRunningBacks = allRunningBacks.filter(rb =>
        rb.name.toLowerCase().includes(searchTerm) ||
        rb.team.toLowerCase().includes(searchTerm)
      )
    }

    return NextResponse.json({
      runningBacks: filteredRunningBacks,
      total: filteredRunningBacks.length,
      query,
      week,
      season
    })

  } catch (error) {
    console.error('Error searching running backs:', error)
    return NextResponse.json(
      { error: 'Failed to search running backs' },
      { status: 500 }
    )
  }
}