import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { NFLApiService } from '@/lib/nfl-api'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { week, season } = body

    if (!week || !season) {
      return NextResponse.json(
        { error: 'Missing week or season' },
        { status: 400 }
      )
    }

    // Get all picks for this week
    const { data: picks, error: picksError } = await supabase
      .from('weekly_picks')
      .select('*')
      .eq('week', week)
      .eq('season', season)

    if (picksError) {
      throw picksError
    }

    // Update total yards for each user based on their picks
    const updates = []
    for (const pick of picks || []) {
      // Fetch live stats from Sportradar API
      let yards = 0
      try {
        const liveStats = await NFLApiService.getPlayerStats(pick.player_id, season, week)
        if (liveStats && liveStats.rushingYards !== undefined) {
          yards = liveStats.rushingYards
        } else {
          console.warn(`No live stats available for player ${pick.player_id}, using current database value`)
          // Fallback to current database value if no live stats
          const { data: currentPlayer } = await supabase
            .from('running_backs')
            .select('yards')
            .eq('player_id', pick.player_id)
            .eq('season', season)
            .eq('week', week)
            .single()
          yards = currentPlayer?.yards || 0
        }
      } catch (error) {
        console.error(`Error fetching live stats for player ${pick.player_id}:`, error)
        // Fallback to current database value
        const { data: currentPlayer } = await supabase
          .from('running_backs')
          .select('yards')
          .eq('player_id', pick.player_id)
          .eq('season', season)
          .eq('week', week)
          .single()
        yards = currentPlayer?.yards || 0
      }
      
      // Update the pick with the yards gained
      const { error: updatePickError } = await supabase
        .from('weekly_picks')
        .update({ 
          yards_gained: yards,
          is_finalized: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', pick.id)

      if (updatePickError) {
        console.error(`Error updating pick ${pick.id}:`, updatePickError)
        continue
      }

      // Update user's total yards
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('total_yards')
        .eq('id', pick.user_id)
        .single()

      const newTotalYards = (currentProfile?.total_yards || 0) + yards

      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({ 
          total_yards: newTotalYards,
          updated_at: new Date().toISOString()
        })
        .eq('id', pick.user_id)

      if (updateProfileError) {
        console.error(`Error updating profile for user ${pick.user_id}:`, updateProfileError)
      } else {
        updates.push({
          userId: pick.user_id,
          playerName: pick.player_name,
          yardsGained: yards,
          newTotal: newTotalYards
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Updated ${updates.length} picks for Week ${week} using live Sportradar API data`,
      updates 
    })
  } catch (error) {
    console.error('Error updating yards:', error)
    return NextResponse.json(
      { error: 'Failed to update yards' },
      { status: 500 }
    )
  }
}
