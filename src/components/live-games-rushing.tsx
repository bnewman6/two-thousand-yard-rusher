'use client'

import { useState, useEffect } from 'react'

interface LiveRusher {
  name: string
  team: string
  yards: number
  attempts: number
  touchdowns: number
  gameId: string
  gameStatus: string
  lastUpdated: string
}

interface LiveGamesRushingProps {
  season: number
  week: number
}

export function LiveGamesRushing({ season, week }: LiveGamesRushingProps) {
  const [liveRushers, setLiveRushers] = useState<LiveRusher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [gameCount, setGameCount] = useState(0)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchLiveStats = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/get-live-game-stats?week=${week}&season=${season}`)
      const data = await response.json()
      
      if (data.success && data.liveRushers) {
        setLiveRushers(data.liveRushers)
        setGameCount(data.gameCount || 0)
        setLastUpdated(new Date())
      } else if (data.message && data.message.includes('Rate limit')) {
        // Show sample data when rate limited (for demo purposes)
        const sampleLiveRushers: LiveRusher[] = [
          { name: 'Jalen Hurts', team: 'PHI', yards: 62, attempts: 14, touchdowns: 2, gameId: 'live-1', gameStatus: 'inprogress', lastUpdated: new Date().toISOString() },
          { name: 'Saquon Barkley', team: 'PHI', yards: 60, attempts: 18, touchdowns: 1, gameId: 'live-1', gameStatus: 'inprogress', lastUpdated: new Date().toISOString() },
          { name: 'Patrick Mahomes', team: 'KC', yards: 57, attempts: 6, touchdowns: 1, gameId: 'live-2', gameStatus: 'inprogress', lastUpdated: new Date().toISOString() },
          { name: 'Javonte Williams', team: 'DAL', yards: 54, attempts: 15, touchdowns: 2, gameId: 'live-2', gameStatus: 'inprogress', lastUpdated: new Date().toISOString() }
        ]
        setLiveRushers(sampleLiveRushers)
        setGameCount(2)
        setLastUpdated(new Date())
        setError('Rate limit reached - showing sample data')
      } else {
        setError(data.message || 'Failed to fetch live stats')
      }
    } catch (err) {
      console.error('Error fetching live stats:', err)
      setError('Failed to load live stats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLiveStats()
  }, [season, week])

  // Auto-refresh every 30 seconds when auto-refresh is enabled
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchLiveStats()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, season, week])

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
      case 1: return '🔥'
      case 2: return '⚡'
      case 3: return '💨'
      default: return `#${rank}`
    }
  }

  const formatLastUpdated = (lastUpdated: string) => {
    const date = new Date(lastUpdated)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    
    if (diffSecs < 60) return `${diffSecs}s ago`
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`
    return date.toLocaleTimeString()
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Live Games Rushing Stats</h2>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
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

  if (error && liveRushers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Live Games Rushing Stats</h2>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchLiveStats}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (liveRushers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Live Games Rushing Stats</h2>
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No live games currently</p>
          <p className="text-sm text-gray-400">Check back when games are in progress!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-semibold">Live Games Rushing Stats</h2>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-red-600 font-medium">LIVE</span>
          </div>
        </div>
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
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              autoRefresh 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title={autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
          >
            {autoRefresh ? 'AUTO' : 'MANUAL'}
          </button>
          <button
            onClick={fetchLiveStats}
            className="text-blue-500 hover:text-blue-600 transition-colors"
            title="Refresh now"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          {gameCount} live game{gameCount !== 1 ? 's' : ''} • Updates every 30 seconds
        </p>
      </div>
      
      <div className="space-y-3">
        {liveRushers.map((rusher, index) => (
          <div key={`${rusher.name}-${rusher.team}-${rusher.gameId}`} className="flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors border border-red-200">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full shadow-sm border-2 border-red-200">
                <span className="text-sm font-bold text-red-700">
                  {getRankIcon(index + 1)}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{rusher.name}</p>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTeamColor(rusher.team)}`}>
                    {rusher.team}
                  </span>
                  <span className="text-xs text-gray-500">
                    {rusher.attempts} att
                  </span>
                  {rusher.touchdowns > 0 && (
                    <span className="text-xs text-green-600 font-medium">
                      {rusher.touchdowns} TD{rusher.touchdowns > 1 ? 's' : ''}
                    </span>
                  )}
                  <span className="text-xs text-red-500">
                    {formatLastUpdated(rusher.lastUpdated)}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-red-700">
                {formatYards(rusher.yards)}
              </p>
              <p className="text-xs text-gray-500">yards</p>
            </div>
          </div>
        ))}
      </div>
      
      {liveRushers.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Showing {liveRushers.length} rusher{liveRushers.length !== 1 ? 's' : ''} from {gameCount} live game{gameCount !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  )
}
