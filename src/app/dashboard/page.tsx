import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/header'
import { DashboardClient } from '@/components/dashboard-client'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  // Debug logging
  console.log('Dashboard - User:', user)
  console.log('Dashboard - Error:', error)
  
  if (error || !user) {
    console.log('Dashboard - Redirecting to auth due to:', error ? 'error' : 'no user')
    redirect('/auth')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header teamName={profile?.team_name} teamLogoData={profile?.team_logo_data} currentPage="dashboard" />
      <DashboardClient profile={profile} />
    </div>
  )
}
