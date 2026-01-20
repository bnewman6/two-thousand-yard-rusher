import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Reset Season: Starting reset for user:', user.id)

    // Delete all picks for the user
    const { error: deletePicksError } = await supabase
      .from('weekly_picks')
      .delete()
      .eq('user_id', user.id)

    if (deletePicksError) {
      console.error('Error deleting picks:', deletePicksError)
      return NextResponse.json(
        { error: 'Failed to delete picks' },
        { status: 500 }
      )
    }

    // Reset total yards to 0
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({ 
        total_yards: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateProfileError) {
      console.error('Error updating profile:', updateProfileError)
      return NextResponse.json(
        { error: 'Failed to reset total yards' },
        { status: 500 }
      )
    }

    console.log('Reset Season: Successfully reset for user:', user.id)

    return NextResponse.json({
      message: 'Season reset successfully',
      deletedPicks: true,
      resetYards: true
    })

  } catch (error) {
    console.error('Error resetting season:', error)
    return NextResponse.json(
      { error: 'Failed to reset season' },
      { status: 500 }
    )
  }
}
