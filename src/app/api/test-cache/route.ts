import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Test inserting a simple player
    const { data, error } = await supabase
      .from('running_backs')
      .insert({
        player_id: 'test-player-123',
        name: 'Test Player',
        team: 'TEST',
        position: 'RB',
        season: 2025,
        week: 1,
        yards: 0,
        games_played: 1,
        is_locked: false,
        game_start_time: null,
        updated_at: new Date().toISOString()
      })
      .select()

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: error
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Test player inserted successfully',
      data
    })

  } catch (error) {
    console.error('Error in test cache:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
