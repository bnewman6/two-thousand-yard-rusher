import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const week = searchParams.get('week')
    const season = searchParams.get('season')

    if (!week || !season) {
      return NextResponse.json(
        { error: 'Week and season are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Check if any picks exist for this week/season and are finalized
    const { data: finalizedPicks, error } = await supabase
      .from('weekly_picks')
      .select('is_finalized')
      .eq('week', parseInt(week))
      .eq('season', parseInt(season))
      .eq('is_finalized', true)
      .limit(1)

    if (error) {
      console.error('Error checking week status:', error)
      return NextResponse.json(
        { error: 'Failed to check week status' },
        { status: 500 }
      )
    }

    const isFinalized = finalizedPicks && finalizedPicks.length > 0

    return NextResponse.json({
      week: parseInt(week),
      season: parseInt(season),
      isFinalized,
      message: isFinalized ? 'Week is finalized - no changes allowed' : 'Week is open for picks'
    })

  } catch (error) {
    console.error('Error in week status endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to check week status' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { week, season, action } = body

    if (!week || !season || !action) {
      return NextResponse.json(
        { error: 'Week, season, and action are required' },
        { status: 400 }
      )
    }

    if (action === 'finalize') {
      // Finalize all picks for this week/season
      const { error: updateError } = await supabase
        .from('weekly_picks')
        .update({ 
          is_finalized: true,
          updated_at: new Date().toISOString()
        })
        .eq('week', week)
        .eq('season', season)

      if (updateError) {
        console.error('Error finalizing week:', updateError)
        return NextResponse.json(
          { error: 'Failed to finalize week' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        message: `Week ${week} finalized successfully`,
        week,
        season,
        isFinalized: true
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error in week status endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to update week status' },
      { status: 500 }
    )
  }
}
