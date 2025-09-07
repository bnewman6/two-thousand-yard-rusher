import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, week, season, playerData } = body

    const supabase = await createClient()

    switch (action) {
      case 'add_player_stats':
        // Add or update player statistics manually
        const { data: existingPlayer } = await supabase
          .from('running_backs')
          .select('*')
          .eq('player_id', playerData.player_id)
          .eq('season', season)
          .eq('week', week)
          .single()

        if (existingPlayer) {
          // Update existing player
          const { data, error } = await supabase
            .from('running_backs')
            .update({
              name: playerData.name,
              team: playerData.team,
              yards: playerData.yards,
              games_played: playerData.games_played || 1,
              is_locked: playerData.is_locked || true,
              game_start_time: playerData.game_start_time,
              opponent: playerData.opponent,
              gameTime: playerData.gameTime || 'Final',
              updated_at: new Date().toISOString(),
              is_manual_entry: true // Flag to indicate this was manually entered
            })
            .eq('id', existingPlayer.id)
            .select()

          if (error) throw error

          return NextResponse.json({ 
            success: true, 
            message: 'Player stats updated successfully',
            data: data[0]
          })
        } else {
          // Insert new player
          const { data, error } = await supabase
            .from('running_backs')
            .insert({
              id: `${playerData.player_id}-${season}-${week}`,
              player_id: playerData.player_id,
              name: playerData.name,
              team: playerData.team,
              position: 'RB',
              season,
              week,
              yards: playerData.yards,
              games_played: playerData.games_played || 1,
              is_locked: playerData.is_locked || true,
              game_start_time: playerData.game_start_time,
              opponent: playerData.opponent,
              gameTime: playerData.gameTime || 'Final',
              updated_at: new Date().toISOString(),
              is_manual_entry: true
            })
            .select()

          if (error) throw error

          return NextResponse.json({ 
            success: true, 
            message: 'Player stats added successfully',
            data: data[0]
          })
        }

      case 'bulk_update_week':
        // Bulk update all players for a week
        const updatePromises = playerData.map(async (player: any) => {
          const { data: existingPlayer } = await supabase
            .from('running_backs')
            .select('*')
            .eq('player_id', player.player_id)
            .eq('season', season)
            .eq('week', week)
            .single()

          if (existingPlayer) {
            return supabase
              .from('running_backs')
              .update({
                name: player.name,
                team: player.team,
                yards: player.yards,
                games_played: player.games_played || 1,
                is_locked: player.is_locked || true,
                game_start_time: player.game_start_time,
                opponent: player.opponent,
                gameTime: player.gameTime || 'Final',
                updated_at: new Date().toISOString(),
                is_manual_entry: true
              })
              .eq('id', existingPlayer.id)
          } else {
            return supabase
              .from('running_backs')
              .insert({
                id: `${player.player_id}-${season}-${week}`,
                player_id: player.player_id,
                name: player.name,
                team: player.team,
                position: 'RB',
                season,
                week,
                yards: player.yards,
                games_played: player.games_played || 1,
                is_locked: player.is_locked || true,
                game_start_time: player.game_start_time,
                opponent: player.opponent,
                gameTime: player.gameTime || 'Final',
                updated_at: new Date().toISOString(),
                is_manual_entry: true
              })
          }
        })

        await Promise.all(updatePromises)

        return NextResponse.json({ 
          success: true, 
          message: `Bulk updated ${playerData.length} players for Week ${week}` 
        })

      case 'delete_manual_entry':
        // Delete a manual entry
        const { error: deleteError } = await supabase
          .from('running_backs')
          .delete()
          .eq('player_id', playerData.player_id)
          .eq('season', season)
          .eq('week', week)
          .eq('is_manual_entry', true)

        if (deleteError) throw deleteError

        return NextResponse.json({ 
          success: true, 
          message: 'Manual entry deleted successfully' 
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in manual data API:', error)
    return NextResponse.json(
      { error: 'Failed to process manual data request' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve manual data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const week = parseInt(searchParams.get('week') || '1')
    const season = parseInt(searchParams.get('season') || '2025')

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('running_backs')
      .select('*')
      .eq('season', season)
      .eq('week', week)
      .eq('is_manual_entry', true)
      .order('yards', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: data || [],
      week,
      season
    })

  } catch (error) {
    console.error('Error fetching manual data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch manual data' },
      { status: 500 }
    )
  }
}
