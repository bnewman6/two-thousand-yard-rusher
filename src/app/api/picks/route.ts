import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const week = searchParams.get('week')
    const season = searchParams.get('season')

    let query = supabase
      .from('weekly_picks')
      .select('*')
      .eq('user_id', user.id)

    if (week) query = query.eq('week', week)
    if (season) query = query.eq('season', season)

    const { data: picks, error } = await query.order('week', { ascending: false })

    if (error) {
      throw error
    }

    console.log('Picks API: Returning picks for user:', user.id, 'week:', week, 'season:', season, 'picks:', picks)

    return NextResponse.json({ picks })
  } catch (error) {
    console.error('Error fetching picks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch picks' },
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
    const { week, season, player_name, player_id } = body

    if (!week || !season || !player_name || !player_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if user already has a pick for this week
    const { data: existingPicks, error: checkError } = await supabase
      .from('weekly_picks')
      .select('id')
      .eq('user_id', user.id)
      .eq('week', week)
      .eq('season', season)

    if (checkError) {
      console.error('Error checking existing picks:', checkError)
    }

    if (existingPicks && existingPicks.length > 0) {
      return NextResponse.json(
        { error: 'Pick already exists for this week' },
        { status: 400 }
      )
    }

    // Insert new pick
    const { data: pick, error } = await supabase
      .from('weekly_picks')
      .insert({
        user_id: user.id,
        week,
        season,
        player_name,
        player_id,
        yards_gained: 0,
        is_finalized: false
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // Don't update total yards yet - only when the week is finalized
    // Total yards will be updated by a separate process after games are played

    return NextResponse.json({ pick })
  } catch (error) {
    console.error('Error creating pick:', error)
    return NextResponse.json(
      { error: 'Failed to create pick' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const week = searchParams.get('week')
    const season = searchParams.get('season')

    if (!week || !season) {
      return NextResponse.json(
        { error: 'Missing week or season parameter' },
        { status: 400 }
      )
    }

    // Delete the pick for this week/season
    const { data: deletedPicks, error } = await supabase
      .from('weekly_picks')
      .delete()
      .eq('user_id', user.id)
      .eq('week', week)
      .eq('season', season)
      .select()

    if (error) {
      throw error
    }

    console.log(`Deleted ${deletedPicks?.length || 0} picks for user ${user.id}, week ${week}, season ${season}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting pick:', error)
    return NextResponse.json(
      { error: 'Failed to delete pick' },
      { status: 500 }
    )
  }
}
