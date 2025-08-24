import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get all profiles with their total yards
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('total_yards', { ascending: false })

    if (profilesError) {
      throw profilesError
    }

    // Get all weekly picks for context
    const { data: picks, error: picksError } = await supabase
      .from('weekly_picks')
      .select('*')
      .order('week', { ascending: false })

    if (picksError) {
      throw picksError
    }

    // Group picks by user
    const picksByUser = picks.reduce((acc, pick) => {
      if (!acc[pick.user_id]) {
        acc[pick.user_id] = []
      }
      acc[pick.user_id].push(pick)
      return acc
    }, {} as Record<string, any[]>)

    // Create leaderboard entries
    const leaderboard = profiles.map((profile, index) => ({
      rank: index + 1,
      user: profile,
      totalYards: profile.total_yards,
      weeklyPicks: picksByUser[profile.id] || []
    }))

    return NextResponse.json({ leaderboard })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}
