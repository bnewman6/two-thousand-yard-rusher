'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PlayoffPlayer, PositionSlot } from '@/types'
import { Search, X, Save, ArrowLeft, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { POSITION_SLOT_CONFIG, getNonFlexSlots, getFlexSlots, areTeamsLocked } from '@/lib/playoffs-utils'

interface TeamEditorClientProps {
  userId: string
  teamId: string | null
}

interface SelectedPlayer {
  position_slot: PositionSlot
  player_id: string
}

export function TeamEditorClient({ userId, teamId }: TeamEditorClientProps) {
  const router = useRouter()
  const [teamName, setTeamName] = useState('')
  const [selectedPlayers, setSelectedPlayers] = useState<SelectedPlayer[]>([])
  const [allPlayers, setAllPlayers] = useState<PlayoffPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQueries, setSearchQueries] = useState<Record<PositionSlot, string>>({} as Record<PositionSlot, string>)
  const [showSearchResults, setShowSearchResults] = useState<Record<PositionSlot, boolean>>({} as Record<PositionSlot, boolean>)
  const searchRefs = useRef<Record<PositionSlot, HTMLDivElement | null>>({} as Record<PositionSlot, HTMLDivElement | null>)
  const teamsLocked = areTeamsLocked()

  useEffect(() => {
    fetchPlayers()
    if (teamId) {
      fetchTeam()
    }
  }, [teamId])

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.keys(searchRefs.current).forEach(slot => {
        const ref = searchRefs.current[slot as PositionSlot]
        if (ref && !ref.contains(event.target as Node)) {
          setShowSearchResults(prev => ({ ...prev, [slot]: false }))
        }
      })
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/playoffs/players')
      const data = await response.json()
      if (data.players) {
        setAllPlayers(data.players)
      }
    } catch (error) {
      console.error('Error fetching players:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTeam = async () => {
    try {
      const response = await fetch(`/api/playoffs/teams?user_id=${userId}&include_players=true`)
      const data = await response.json()
      const team = data.teams?.find((t: any) => t.id === teamId)
      if (team) {
        setTeamName(team.team_name)
        setSelectedPlayers(
          team.players.map((tp: any) => ({
            position_slot: tp.position_slot,
            player_id: tp.player_id
          }))
        )
      }
    } catch (error) {
      console.error('Error fetching team:', error)
    }
  }

  const getFilteredPlayers = (slot: PositionSlot, query: string): PlayoffPlayer[] => {
    const slotConfig = POSITION_SLOT_CONFIG[slot]
    const queryLower = query.toLowerCase()
    
    let filtered = allPlayers.filter(player => {
      // For FLEX slots, allow RB, WR, TE
      if (slotConfig.position === 'FLEX') {
        if (!['RB', 'WR', 'TE'].includes(player.position)) return false
      } else {
        // For position-specific slots, match position exactly
        if (player.position !== slotConfig.position) return false
      }
      
      // Filter by search query
      if (queryLower) {
        return player.name.toLowerCase().includes(queryLower) ||
               player.nfl_team.toLowerCase().includes(queryLower)
      }
      
      return true
    })

    // For non-FLEX slots, exclude players from teams already used in other non-FLEX slots
    if (slotConfig.position !== 'FLEX') {
      const nonFlexSlots = getNonFlexSlots()
      const usedTeams = new Set(
        selectedPlayers
          .filter(sp => sp.position_slot !== slot && nonFlexSlots.includes(sp.position_slot))
          .map(sp => {
            const player = allPlayers.find(p => p.id === sp.player_id)
            return player?.nfl_team
          })
          .filter(Boolean)
      )
      filtered = filtered.filter(player => !usedTeams.has(player.nfl_team))
    }

    // Exclude players already selected in other slots
    const selectedPlayerIds = selectedPlayers
      .filter(sp => sp.position_slot !== slot)
      .map(sp => sp.player_id)
    filtered = filtered.filter(player => !selectedPlayerIds.includes(player.id))

    return filtered.slice(0, 10) // Limit to 10 results
  }

  const handleSearchChange = (slot: PositionSlot, query: string) => {
    setSearchQueries(prev => ({ ...prev, [slot]: query }))
    setShowSearchResults(prev => ({ ...prev, [slot]: query.length > 0 }))
  }

  const handleSelectPlayer = (slot: PositionSlot, playerId: string) => {
    setSelectedPlayers(prev => {
      const filtered = prev.filter(sp => sp.position_slot !== slot)
      return [...filtered, { position_slot: slot, player_id: playerId }]
    })
    setSearchQueries(prev => ({ ...prev, [slot]: '' }))
    setShowSearchResults(prev => ({ ...prev, [slot]: false }))
  }

  const handleRemovePlayer = (slot: PositionSlot) => {
    setSelectedPlayers(prev => prev.filter(sp => sp.position_slot !== slot))
    setSearchQueries(prev => ({ ...prev, [slot]: '' }))
  }

  const handleSave = async () => {
    if (!teamName.trim()) {
      setError('Team name is required')
      return
    }

    // Validate that all slots are filled
    const allSlots = [...getNonFlexSlots(), ...getFlexSlots()]
    const filledSlots = new Set(selectedPlayers.map(sp => sp.position_slot))
    const missingSlots = allSlots.filter(slot => !filledSlots.has(slot))
    
    if (missingSlots.length > 0) {
      setError(`Please fill all position slots. Missing: ${missingSlots.map(s => POSITION_SLOT_CONFIG[s].label).join(', ')}`)
      return
    }

    setSaving(true)
    setError(null)

    try {
      const url = teamId ? '/api/playoffs/teams' : '/api/playoffs/teams'
      const method = teamId ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: teamId,
          team_name: teamName,
          players: selectedPlayers
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save team')
      }

      router.push('/playoffs/dashboard')
    } catch (error: any) {
      setError(error.message || 'Failed to save team')
    } finally {
      setSaving(false)
    }
  }

  const getSelectedPlayer = (slot: PositionSlot): PlayoffPlayer | undefined => {
    const selected = selectedPlayers.find(sp => sp.position_slot === slot)
    if (!selected) return undefined
    return allPlayers.find(p => p.id === selected.player_id)
  }

  const renderPositionSlot = (slot: PositionSlot) => {
    const slotConfig = POSITION_SLOT_CONFIG[slot]
    const selectedPlayer = getSelectedPlayer(slot)
    const searchQuery = searchQueries[slot] || ''
    const showResults = showSearchResults[slot] || false
    const filteredPlayers = getFilteredPlayers(slot, searchQuery)

    return (
      <div key={slot} className="space-y-2">
        <Label>{slotConfig.label}</Label>
        {selectedPlayer ? (
          <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
            <div className="flex-1">
              <div className="font-semibold">{selectedPlayer.name}</div>
              <div className="text-sm text-gray-700">
                {selectedPlayer.position} - {selectedPlayer.nfl_team}
              </div>
            </div>
            {!teamsLocked && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemovePlayer(slot)}
                className="ml-2"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          <div className="relative" ref={el => searchRefs.current[slot] = el}>
            {!teamsLocked && (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder={`Search ${slotConfig.position === 'FLEX' ? 'RB/WR/TE' : slotConfig.position}...`}
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(slot, e.target.value)}
                    className="pl-10"
                    disabled={teamsLocked}
                  />
                </div>
                {showResults && filteredPlayers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredPlayers.map(player => (
                      <button
                        key={player.id}
                        onClick={() => handleSelectPlayer(slot, player.id)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b last:border-b-0"
                      >
                        <div className="font-semibold">{player.name}</div>
                        <div className="text-sm text-gray-700">
                          {player.position} - {player.nfl_team}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/playoffs/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {teamId ? 'Edit Team' : 'Create New Team'}
        </h1>
        {teamsLocked && (
          <p className="text-sm text-amber-600 mt-2">
            Teams are locked. You can view but not edit.
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="team-name">Team Name</Label>
            <Input
              id="team-name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter team name"
              disabled={teamsLocked}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-4 border-t">
            <h2 className="text-lg font-semibold mb-4">Quarterbacks (3)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['QB1', 'QB2', 'QB3'] as PositionSlot[]).map(renderPositionSlot)}
            </div>
          </div>

          <div className="pt-4 border-t">
            <h2 className="text-lg font-semibold mb-4">Running Backs (3)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['RB1', 'RB2', 'RB3'] as PositionSlot[]).map(renderPositionSlot)}
            </div>
          </div>

          <div className="pt-4 border-t">
            <h2 className="text-lg font-semibold mb-4">Wide Receivers (4)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(['WR1', 'WR2', 'WR3', 'WR4'] as PositionSlot[]).map(renderPositionSlot)}
            </div>
          </div>

          <div className="pt-4 border-t">
            <h2 className="text-lg font-semibold mb-4">Tight Ends (2)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(['TE1', 'TE2'] as PositionSlot[]).map(renderPositionSlot)}
            </div>
          </div>

          <div className="pt-4 border-t">
            <h2 className="text-lg font-semibold mb-4">Kickers (2)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(['K1', 'K2'] as PositionSlot[]).map(renderPositionSlot)}
            </div>
          </div>

          <div className="pt-4 border-t">
            <h2 className="text-lg font-semibold mb-4">FLEX (3 - RB/WR/TE)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['FLEX1', 'FLEX2', 'FLEX3'] as PositionSlot[]).map(renderPositionSlot)}
            </div>
          </div>

          {!teamsLocked && (
            <div className="pt-4 border-t flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="min-w-[120px]"
              >
                {saving ? 'Saving...' : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Team
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

