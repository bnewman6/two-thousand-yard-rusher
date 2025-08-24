import { NextRequest, NextResponse } from 'next/server'
import { NFLApiService } from '@/lib/nfl-api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const week = parseInt(searchParams.get('week') || '1')
    const season = parseInt(searchParams.get('season') || '2025')

    // Get all running backs for search
    const allRunningBacks = await NFLApiService.getAllRunningBacksForSearch(week, season)

    // Filter by search query if provided
    let filteredRunningBacks = allRunningBacks
    if (query.trim()) {
      const searchTerm = query.toLowerCase()
      filteredRunningBacks = allRunningBacks.filter(rb =>
        rb.name.toLowerCase().includes(searchTerm) ||
        rb.team.toLowerCase().includes(searchTerm)
      )
    }

    // Limit results to prevent overwhelming the UI
    const limitedResults = filteredRunningBacks.slice(0, 100)

    return NextResponse.json({
      runningBacks: limitedResults,
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
