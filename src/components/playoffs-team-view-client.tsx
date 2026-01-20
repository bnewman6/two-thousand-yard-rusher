'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FantasyTeamWithPlayers, PositionSlot } from '@/types'
import { Trophy, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

// Format points with 2 decimals, trimming trailing zeros
const formatPoints = (points: number | string): string => {
  const num = typeof points === 'string' ? parseFloat(points) : points
  return parseFloat(num.toFixed(2)).toString()
}

const POSITION_SLOTS: PositionSlot[] = [
  'QB1', 'QB2', 'QB3',
  'RB1', 'RB2', 'RB3',
  'WR1', 'WR2', 'WR3', 'WR4',
  'TE1', 'TE2',
  'K1', 'K2',
  'FLEX1', 'FLEX2', 'FLEX3'
]

interface TeamViewClientProps {
  team: FantasyTeamWithPlayers & { rank: number | null }
}

export function TeamViewClient({ team }: TeamViewClientProps) {
  const router = useRouter()

  const getPlayerForSlot = (slot: PositionSlot) => {
    const teamPlayer = team.players.find(tp => tp.position_slot === slot)
    return teamPlayer?.player || null
  }

  const getRankDisplay = (rank: number | null) => {
    if (rank === null) return '—'
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Dashboard</span>
      </button>

      {/* Team Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {team.team_name}
            </h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-gray-900" />
                <span className="text-lg font-semibold text-gray-900">
                  Rank: {getRankDisplay(team.rank)}
                </span>
              </div>
              <div className="text-lg font-semibold text-blue-600">
                {formatPoints(team.total_points)} PTS
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Players Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900">Team Roster</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {POSITION_SLOTS.map(slot => {
              const player = getPlayerForSlot(slot)
              
              return (
                <div
                  key={slot}
                  className="p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="text-xs font-medium text-gray-500 mb-1">{slot}</div>
                      {player ? (
                        <>
                          <div className="font-semibold text-gray-900">{player.name}</div>
                          <div className="text-sm text-gray-600">
                            {player.position} • {player.nfl_team}
                          </div>
                        </>
                      ) : (
                        <div className="text-gray-400 italic">No player</div>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-bold text-gray-900">
                        {player ? formatPoints(player.tot_pts) : '0'}
                      </div>
                      <div className="text-xs text-gray-500">PTS</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Total Points Summary */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Total Points</div>
              <div className="text-3xl font-bold text-gray-900">
                {formatPoints(team.total_points)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">Overall Rank</div>
              <div className="text-3xl font-bold text-gray-900">
                {getRankDisplay(team.rank)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
