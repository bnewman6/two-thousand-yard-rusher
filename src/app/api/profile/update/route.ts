import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { team_name, logo_data } = body

    // Validate team name if provided
    if (team_name !== undefined) {
      if (!team_name || team_name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Team name is required' },
          { status: 400 }
        )
      }

      if (team_name.trim().length > 50) {
        return NextResponse.json(
          { error: 'Team name must be 50 characters or less' },
          { status: 400 }
        )
      }
    }

    // Validate logo data if provided
    if (logo_data !== undefined) {
      try {
        const parsedLogo = JSON.parse(logo_data)
        if (!Array.isArray(parsedLogo) || parsedLogo.length !== 12) {
          return NextResponse.json(
            { error: 'Invalid logo data format' },
            { status: 400 }
          )
        }
      } catch {
        return NextResponse.json(
          { error: 'Invalid logo data' },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (team_name !== undefined) {
      updateData.team_name = team_name.trim()
    }

    if (logo_data !== undefined) {
      updateData.team_logo_data = logo_data
    }

    // Update the profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Profile updated successfully',
      team_name: team_name !== undefined ? team_name.trim() : undefined,
      logo_data: logo_data !== undefined ? logo_data : undefined
    })

  } catch (error) {
    console.error('Error in profile update endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
