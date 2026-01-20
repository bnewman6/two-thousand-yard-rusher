import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// GET - Get all players (public)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { searchParams } = new URL(request.url)
    const position = searchParams.get('position')
    const team = searchParams.get('team')
    const sortBy = searchParams.get('sortBy') || 'tot_pts'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    let query = supabase
      .from('players')
      .select('*')

    if (position) {
      query = query.eq('position', position)
    }
    if (team) {
      query = query.eq('nfl_team', team)
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    const { data: players, error } = await query

    if (error) {
      console.error('Error fetching players:', error)
      return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 })
    }

    return NextResponse.json({ players: players || [] })
  } catch (error) {
    console.error('Error in GET /api/playoffs/players:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new player (admin - no auth check for now)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const body = await request.json()
    const { name, position, nfl_team } = body

    if (!name || !position || !nfl_team) {
      return NextResponse.json({ error: 'Missing required fields: name, position, nfl_team' }, { status: 400 })
    }

    const { data: player, error } = await supabase
      .from('players')
      .insert({
        name,
        position,
        nfl_team,
        passing_yds: body.passing_yds || 0,
        passing_td: body.passing_td || 0,
        int: body.int || 0,
        rush_yds: body.rush_yds || 0,
        rush_td: body.rush_td || 0,
        rec: body.rec || 0,
        rec_yds: body.rec_yds || 0,
        rec_td: body.rec_td || 0,
        fum: body.fum || 0,
        kicking_pts: body.kicking_pts || 0,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating player:', error)
      return NextResponse.json({ error: 'Failed to create player' }, { status: 500 })
    }

    return NextResponse.json({ player }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/playoffs/players:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update a player (admin - no auth check for now)
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Player ID required' }, { status: 400 })
    }

    const { data: player, error } = await supabase
      .from('players')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating player:', error)
      return NextResponse.json({ error: 'Failed to update player' }, { status: 500 })
    }

    return NextResponse.json({ player })
  } catch (error) {
    console.error('Error in PUT /api/playoffs/players:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
