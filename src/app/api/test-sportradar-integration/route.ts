import { NextRequest, NextResponse } from 'next/server'
import { NFLApiService } from '@/lib/nfl-api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const week = parseInt(searchParams.get('week') || '1')
    
    console.log(`Testing SportRadar integration for Week ${week}...`)
    
    // Test the SportRadar API directly
    const result = await NFLApiService.fetchFromSportRadarAPI(week)
    
    return NextResponse.json({
      success: true,
      week,
      playerCount: result.length,
      players: result.slice(0, 5), // Show first 5 players
      message: 'SportRadar API integration working!'
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: 'SportRadar API integration failed'
    })
  }
}
