import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { ProfileClient } from '@/components/profile-client'
import { Header } from '@/components/header'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/auth')
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('Error fetching profile:', profileError)
    redirect('/auth')
  }

  // Get user's picks
  const { data: picks, error: picksError } = await supabase
    .from('weekly_picks')
    .select('*')
    .eq('user_id', user.id)
    .order('week', { ascending: true })

  if (picksError) {
    console.error('Error fetching picks:', picksError)
  }

  // Get leaderboard position
  const { data: leaderboard, error: leaderboardError } = await supabase
    .from('profiles')
    .select('id, team_name, total_yards')
    .order('total_yards', { ascending: false })

  let leaderboardPosition = 0
  if (!leaderboardError && leaderboard) {
    const position = leaderboard.findIndex(p => p.id === user.id)
    leaderboardPosition = position >= 0 ? position + 1 : 0
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header teamName={profile?.team_name} teamLogoData={profile?.team_logo_data} currentPage="profile" />
      <ProfileClient 
        user={user}
        profile={profile}
        picks={picks || []}
        leaderboardPosition={leaderboardPosition}
      />
    </div>
  )
}
