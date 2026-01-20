'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PlayoffPlayer } from '@/types'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

type SortField = 'name' | 'position' | 'nfl_team' | 'tot_pts' | 'passing_yds' | 'rush_yds' | 'rec_yds'
type SortOrder = 'asc' | 'desc'

export function PlayersClient() {
  const [players, setPlayers] = useState<PlayoffPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('tot_pts')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [positionFilter, setPositionFilter] = useState<string>('')
  const [teamFilter, setTeamFilter] = useState<string>('')

  useEffect(() => {
    fetchPlayers()
  }, [])

  const fetchPlayers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (positionFilter) params.append('position', positionFilter)
      if (teamFilter) params.append('team', teamFilter)
      params.append('sortBy', sortField)
      params.append('sortOrder', sortOrder)

      const response = await fetch(`/api/playoffs/players?${params.toString()}`)
      const data = await response.json()
      if (data.players) {
        setPlayers(data.players)
      }
    } catch (error) {
      console.error('Error fetching players:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlayers()
  }, [sortField, sortOrder, positionFilter, teamFilter])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.nfl_team.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const getUniqueValues = (field: 'position' | 'nfl_team') => {
    const values = new Set(players.map(p => p[field]))
    return Array.from(values).sort()
  }

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-blue-600 transition-colors text-gray-900"
    >
      {children}
      {sortField === field ? (
        sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
      ) : (
        <ArrowUpDown className="h-4 w-4 opacity-50" />
      )}
    </button>
  )

  // Helper function to format passing stats (only show non-zero values)
  const formatPassingStats = (player: PlayoffPlayer): string => {
    const parts: string[] = []
    if (player.passing_yds !== 0) parts.push(`${player.passing_yds} yds`)
    if (player.passing_td !== 0) parts.push(`${player.passing_td} TD`)
    if (player.int !== 0) parts.push(`${player.int} INT`)
    return parts.join(', ')
  }

  // Helper function to format rushing stats (only show non-zero values)
  const formatRushingStats = (player: PlayoffPlayer): string => {
    const parts: string[] = []
    if (player.rush_yds !== 0) parts.push(`${player.rush_yds} yds`)
    if (player.rush_td !== 0) parts.push(`${player.rush_td} TD`)
    return parts.join(', ')
  }

  // Helper function to format receiving stats (only show non-zero values)
  const formatReceivingStats = (player: PlayoffPlayer): string => {
    const parts: string[] = []
    if (player.rec !== 0) parts.push(`${player.rec} rec`)
    if (player.rec_yds !== 0) parts.push(`${player.rec_yds} yds`)
    if (player.rec_td !== 0) parts.push(`${player.rec_td} TD`)
    return parts.join(', ')
  }

  // Check if category has any non-zero stats
  const hasPassingStats = (player: PlayoffPlayer) => player.passing_yds !== 0 || player.passing_td !== 0 || player.int !== 0
  const hasRushingStats = (player: PlayoffPlayer) => player.rush_yds !== 0 || player.rush_td !== 0
  const hasReceivingStats = (player: PlayoffPlayer) => player.rec !== 0 || player.rec_yds !== 0 || player.rec_td !== 0
  const hasKickingStats = (player: PlayoffPlayer) => player.kicking_pts !== 0

  // Format points with 2 decimals, trimming trailing zeros
  const formatPoints = (points: number | string): string => {
    const num = typeof points === 'string' ? parseFloat(points) : points
    // Use toFixed(2) to ensure 2 decimal places, then parseFloat removes trailing zeros
    return parseFloat(num.toFixed(2)).toString()
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-900">Players</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Loading players...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900">Players</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 space-y-2 sm:space-y-0 sm:flex sm:gap-2">
            <Input
              placeholder="Search by name or team..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-white text-gray-900 placeholder:text-gray-500"
            />
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-white text-gray-900 px-3 text-sm"
            >
              <option value="">All Positions</option>
              {getUniqueValues('position').map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-white text-gray-900 px-3 text-sm"
            >
              <option value="">All Teams</option>
              {getUniqueValues('nfl_team').map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>

          {/* Mobile view - Cards */}
          <div className="block sm:hidden space-y-2">
            {filteredPlayers.map(player => (
              <div key={player.id} className="border rounded-lg p-3 bg-white">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold text-gray-900">{player.name}</div>
                    <div className="text-sm text-gray-700">{player.position} - {player.nfl_team}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{formatPoints(player.tot_pts)}</div>
                    <div className="text-xs text-gray-600">PTS</div>
                  </div>
                </div>
                {/* Show stats only if they have non-zero values */}
                <div className="text-xs text-gray-700 space-y-1">
                  {/* Passing Stats */}
                  {hasPassingStats(player) && (
                    <div>Pass: {formatPassingStats(player)}</div>
                  )}
                  {/* Rushing Stats */}
                  {hasRushingStats(player) && (
                    <div>Rush: {formatRushingStats(player)}</div>
                  )}
                  {/* Receiving Stats */}
                  {hasReceivingStats(player) && (
                    <div>Rec: {formatReceivingStats(player)}</div>
                  )}
                  {/* Fumbles */}
                  {player.fum !== 0 && (
                    <div>Fumbles: {player.fum}</div>
                  )}
                  {/* Kicking Stats */}
                  {hasKickingStats(player) && (
                    <div>Kicking: {player.kicking_pts} pts</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop view - Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 text-gray-900">
                    <SortButton field="name">Name</SortButton>
                  </th>
                  <th className="text-left p-2 text-gray-900">
                    <SortButton field="position">Pos</SortButton>
                  </th>
                  <th className="text-left p-2 text-gray-900">
                    <SortButton field="nfl_team">Team</SortButton>
                  </th>
                  <th className="text-left p-2 text-gray-900">Passing</th>
                  <th className="text-left p-2 text-gray-900">Rushing</th>
                  <th className="text-left p-2 text-gray-900">Receiving</th>
                  <th className="text-left p-2 text-gray-900">Kicking</th>
                  <th className="text-left p-2 text-gray-900">
                    <SortButton field="tot_pts">Total PTS</SortButton>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map(player => (
                  <tr key={player.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium text-gray-900">{player.name}</td>
                    <td className="p-2 text-gray-900">{player.position}</td>
                    <td className="p-2 text-gray-900">{player.nfl_team}</td>
                    <td className="p-2 text-sm text-gray-900">
                      {hasPassingStats(player) ? (
                        <div>{formatPassingStats(player)}</div>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="p-2 text-sm text-gray-900">
                      {hasRushingStats(player) ? (
                        <div>{formatRushingStats(player)}</div>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="p-2 text-sm text-gray-900">
                      {hasReceivingStats(player) ? (
                        <div>{formatReceivingStats(player)}</div>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="p-2 text-sm text-gray-900">
                      {hasKickingStats(player) ? (
                        <div>{player.kicking_pts} pts</div>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="p-2 font-semibold text-gray-900">{formatPoints(player.tot_pts)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredPlayers.length === 0 && (
            <div className="text-center py-8 text-gray-700">
              No players found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

