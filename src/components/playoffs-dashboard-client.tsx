'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlayoffsLeaderboardEntry } from '@/types'
import { Trophy } from 'lucide-react'
import { useRouter } from 'next/navigation'

// Format points with 2 decimals, trimming trailing zeros
const formatPoints = (points: number): string => {
  // Use toFixed(2) to ensure 2 decimal places, then parseFloat removes trailing zeros
  return parseFloat(points.toFixed(2)).toString()
}

export function PlayoffsDashboardClient() {
  const [leaderboard, setLeaderboard] = useState<PlayoffsLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch leaderboard
      const leaderboardResponse = await fetch('/api/playoffs/leaderboard')
      const leaderboardData = await leaderboardResponse.json()
      if (leaderboardData.leaderboard) {
        setLeaderboard(leaderboardData.leaderboard)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Playoffs Fantasy Dashboard
        </h1>
        <p className="text-sm text-gray-700">View all teams and track the leaderboard throughout the playoffs!</p>
      </div>

      {/* Leaderboard */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Trophy className="h-5 w-5 text-gray-900" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.fantasy_team.id}
                  onClick={() => router.push(`/playoffs/team/${entry.fantasy_team.id}`)}
                  className="flex items-center justify-between p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="font-bold text-gray-900 w-8">#{entry.rank}</div>
                    <div>
                      <div className="font-semibold text-gray-900">{entry.fantasy_team.team_name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-gray-900">{formatPoints(entry.total_points)}</div>
                    <div className="text-xs text-gray-600">PTS</div>
                  </div>
                </div>
              ))}
            </div>
            {leaderboard.length === 0 && (
              <div className="text-center py-8 text-gray-700">
                No teams yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
