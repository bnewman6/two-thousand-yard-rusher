'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { LeaderboardEntry } from '@/types'
import { LogoDisplaySimple } from '@/components/logo-display'

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Listen for leaderboard refresh events
  useEffect(() => {
    const handleLeaderboardRefresh = () => {
      fetchLeaderboard(true)
    }

    window.addEventListener('leaderboardRefresh', handleLeaderboardRefresh)
    return () => window.removeEventListener('leaderboardRefresh', handleLeaderboardRefresh)
  }, [])

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    
    try {
      const response = await fetch('/api/leaderboard')
      const data = await response.json()
      
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard)
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      if (isRefresh) {
        setRefreshing(false)
      } else {
        setLoading(false)
      }
    }
  }

  const handleRefresh = () => {
    fetchLeaderboard(true)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading leaderboard...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Leaderboard</CardTitle>
            <p className="text-sm text-gray-600">
              Race to 2,000 yards!
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {leaderboard.length === 0 ? (
          <p className="text-gray-600">No players yet. Be the first to make a pick!</p>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.user.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  index === 0 ? 'bg-yellow-50 border border-yellow-200' :
                  index === 1 ? 'bg-gray-50 border border-gray-200' :
                  index === 2 ? 'bg-orange-50 border border-orange-200' :
                  'bg-white border border-gray-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-yellow-400 text-yellow-900' :
                    index === 1 ? 'bg-gray-400 text-gray-900' :
                    index === 2 ? 'bg-orange-400 text-orange-900' :
                    'bg-blue-400 text-blue-900'
                  }`}>
                    {index + 1}
                  </div>
                  
                  {/* Team Logo */}
                  <div className="flex-shrink-0">
                    {entry.user.team_logo_data ? (
                      <LogoDisplaySimple 
                        logoData={entry.user.team_logo_data} 
                        size="sm"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-200 rounded border-2 border-dashed border-gray-300 flex items-center justify-center">
                        <span className="text-xs text-gray-500">?</span>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <div className="font-medium">{entry.user.team_name}</div>
                    <div className="text-sm text-gray-600">
                      {entry.weeklyPicks.length} picks made • {Math.round((entry.totalYards / 2000) * 100)}% to goal
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">{entry.totalYards}</div>
                  <div className="text-sm text-gray-600">yards</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
