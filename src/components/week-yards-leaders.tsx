'use client'

import { useState, useEffect } from 'react'

interface YardsLeader {
  name: string
  team: string
  yards: number
  attempts: number
  touchdowns: number
}

interface WeekYardsLeadersProps {
  season: number
  week: number
}

export function WeekYardsLeaders({ season, week }: WeekYardsLeadersProps) {
  const [leaders, setLeaders] = useState<YardsLeader[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchLeaders = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/get-completed-game-stats?week=${week}&season=${season}`)
      const data = await response.json()
      
      if (data.success && data.topRushers) {
        setLeaders(data.topRushers.slice(0, 10)) // Top 10 leaders
        setLastUpdated(new Date())
      } else if (data.message && data.message.includes('Rate limit')) {
        // Show sample data when rate limited (for demo purposes)
        const sampleLeaders: YardsLeader[] = [
          { name: 'Jalen Hurts', team: 'PHI', yards: 62, attempts: 14, touchdowns: 2 },
          { name: 'Saquon Barkley', team: 'PHI', yards: 60, attempts: 18, touchdowns: 1 },
          { name: 'Patrick Mahomes', team: 'KC', yards: 57, attempts: 6, touchdowns: 1 },
          { name: 'Javonte Williams', team: 'DAL', yards: 54, attempts: 15, touchdowns: 2 },
          { name: 'Miles Sanders', team: 'DAL', yards: 53, attempts: 4, touchdowns: 0 }
        ]
        setLeaders(sampleLeaders)
        setLastUpdated(new Date())
        setError('Rate limit reached - showing sample data')
      } else {
        setError(data.message || 'Failed to fetch leaders')
      }
    } catch (err) {
      console.error('Error fetching yards leaders:', err)
      setError('Failed to load yards leaders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaders()
  }, [season, week])

  const formatYards = (yards: number) => {
    return yards.toLocaleString()
  }

  const getTeamColor = (team: string) => {
    const teamColors: Record<string, string> = {
      'PHI': 'bg-green-100 text-green-800',
      'DAL': 'bg-blue-100 text-blue-800',
      'KC': 'bg-red-100 text-red-800',
      'LAC': 'bg-yellow-100 text-yellow-800',
      'NO': 'bg-purple-100 text-purple-800',
      'ARI': 'bg-red-100 text-red-800',
      'NE': 'bg-blue-100 text-blue-800',
      'LV': 'bg-gray-100 text-gray-800',
      'WAS': 'bg-red-100 text-red-800',
      'NYG': 'bg-blue-100 text-blue-800',
      'JAC': 'bg-teal-100 text-teal-800',
      'CAR': 'bg-blue-100 text-blue-800',
      'ATL': 'bg-red-100 text-red-800',
      'TB': 'bg-red-100 text-red-800',
      'NYJ': 'bg-green-100 text-green-800',
      'PIT': 'bg-yellow-100 text-yellow-800',
      'CIN': 'bg-orange-100 text-orange-800',
      'CLE': 'bg-orange-100 text-orange-800',
      'MIA': 'bg-teal-100 text-teal-800',
      'IND': 'bg-blue-100 text-blue-800'
    }
    return teamColors[team] || 'bg-gray-100 text-gray-800'
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return `#${rank}`
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Week {week} Yards Leaders</h2>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="w-32 h-4 bg-gray-200 rounded"></div>
                  <div className="w-12 h-4 bg-gray-200 rounded"></div>
                </div>
                <div className="w-16 h-4 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error && leaders.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Week {week} Yards Leaders</h2>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchLeaders}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (leaders.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Week {week} Yards Leaders</h2>
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No completed games yet</p>
          <p className="text-sm text-gray-400">Check back after games finish!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Week {week} Yards Leaders</h2>
        <div className="flex items-center space-x-2">
          {error && (
            <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
              {error}
            </span>
          )}
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchLeaders}
            className="text-blue-500 hover:text-blue-600 transition-colors"
            title="Refresh leaders"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="space-y-3">
        {leaders.map((leader, index) => (
          <div key={`${leader.name}-${leader.team}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full shadow-sm">
                <span className="text-sm font-bold text-gray-700">
                  {getRankIcon(index + 1)}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{leader.name}</p>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTeamColor(leader.team)}`}>
                    {leader.team}
                  </span>
                  <span className="text-xs text-gray-500">
                    {leader.attempts} att
                  </span>
                  {leader.touchdowns > 0 && (
                    <span className="text-xs text-green-600 font-medium">
                      {leader.touchdowns} TD{leader.touchdowns > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">
                {formatYards(leader.yards)}
              </p>
              <p className="text-xs text-gray-500">yards</p>
            </div>
          </div>
        ))}
      </div>
      
      {leaders.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Showing top {leaders.length} rushers from completed games
          </p>
        </div>
      )}
    </div>
  )
}
