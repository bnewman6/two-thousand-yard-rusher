import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
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
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {profile?.team_name || 'Coach'}!
          </h1>
          <p className="text-gray-600">
            Current total: {profile?.total_yards || 0} yards
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Week Pick */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">This Week's Pick</h2>
            <p className="text-gray-600">
              Week selection coming soon...
            </p>
          </div>
          
          {/* Progress to Goal */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Progress to 2,000 Yards</h2>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="bg-green-500 h-4 rounded-full" 
                style={{ width: `${Math.min(((profile?.total_yards || 0) / 2000) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {2000 - (profile?.total_yards || 0)} yards to go!
            </p>
          </div>
          
          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Stats</h2>
            <p className="text-gray-600">
              Leaderboard and stats coming soon...
            </p>
          </div>
        </div>
        
        {/* Recent Picks */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Recent Picks</h2>
          </div>
          <div className="p-6">
            <p className="text-gray-600">
              Pick history will appear here...
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
