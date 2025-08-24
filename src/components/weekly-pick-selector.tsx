'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { RunningBack } from '@/types'
import { Search, X } from 'lucide-react'

interface WeeklyPickSelectorProps {
  onPickSubmitted?: () => void
  currentWeek?: number
  currentSeason?: number
}

export function WeeklyPickSelector({ onPickSubmitted, currentWeek: propWeek, currentSeason: propSeason }: WeeklyPickSelectorProps) {
  const [runningBacks, setRunningBacks] = useState<RunningBack[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [currentWeek, setCurrentWeek] = useState(propWeek || 1)
  const [currentSeason, setCurrentSeason] = useState(propSeason || 2023)
  const [currentPick, setCurrentPick] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [weekFinalized, setWeekFinalized] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<RunningBack[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const prevWeekSeasonRef = useRef<{ week: number; season: number } | null>(null)

  // Single useEffect to handle all state updates and data fetching
  useEffect(() => {
    console.log('WeeklyPickSelector: useEffect triggered with props:', { propWeek, propSeason })
    
    // Safety check for undefined props
    if (propWeek === undefined || propSeason === undefined) {
      console.error('WeeklyPickSelector: Received undefined props:', { propWeek, propSeason })
      return
    }

    const week = propWeek || 1
    const season = propSeason || 2023
    
    console.log('WeeklyPickSelector: Processed week/season:', { week, season, currentWeek, currentSeason })
    
    // Always update state if props are different from current state
    if (currentWeek !== week || currentSeason !== season) {
      console.log('WeeklyPickSelector: State mismatch detected, updating state')
      setCurrentWeek(week)
      setCurrentSeason(season)
      // Clear current pick when week changes
      setCurrentPick(null)
      setSelectedPlayer('')
      // Fetch new data for the new week
      fetchRunningBacks(week, season)
      // Fetch current pick for the new week
      fetchCurrentPick(week, season)
      // Check week status
      checkWeekStatus(week, season)
      // Update ref
      prevWeekSeasonRef.current = { week, season }
    } else {
      // Same week/season, just ensure we have the data
      console.log('WeeklyPickSelector: Same week/season, ensuring data is loaded')
      fetchRunningBacks(week, season)
      fetchCurrentPick(week, season)
      checkWeekStatus(week, season)
    }
  }, [propWeek, propSeason, currentWeek, currentSeason])

  const fetchRunningBacks = async (week?: number, season?: number) => {
    setLoading(true)
    try {
      // Always use the explicit parameters, never fall back to currentWeek/currentSeason
      if (!week || !season) {
        console.error('WeeklyPickSelector: Missing week or season for fetchRunningBacks:', { week, season })
        return
      }
      
      console.log('WeeklyPickSelector: Fetching RBs for week/season:', { week, season })
      
      const response = await fetch(`/api/nfl/running-backs?week=${week}&season=${season}`)
      const data = await response.json()
      
      if (data.runningBacks) {
        setRunningBacks(data.runningBacks)
        console.log('WeeklyPickSelector: Received RBs for week/season:', { week, season })
      }
    } catch (error) {
      console.error('Error fetching running backs:', error)
      setError('Failed to load running backs. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchCurrentPick = async (week?: number, season?: number) => {
    try {
      // Always use the explicit parameters, never fall back to currentWeek/currentSeason
      if (!week || !season) {
        console.error('WeeklyPickSelector: Missing week or season for fetchCurrentPick:', { 
          week, 
          season, 
          currentWeek, 
          currentSeason,
          propWeek,
          propSeason
        })
        return
      }
      
      console.log('WeeklyPickSelector: Fetching current pick for:', { week, season })
      
      const response = await fetch(`/api/picks?week=${week}&season=${season}`)
      const data = await response.json()
      
      console.log('WeeklyPickSelector: Pick fetch result:', data)
      
      if (data.picks && data.picks.length > 0) {
        console.log('WeeklyPickSelector: Setting current pick:', data.picks[0])
        setCurrentPick(data.picks[0])
      } else {
        console.log('WeeklyPickSelector: No pick found for this week')
        setCurrentPick(null)
      }
    } catch (error) {
      console.error('Error fetching current pick:', error)
    }
  }

  const checkWeekStatus = async (week?: number, season?: number) => {
    try {
      // Always use the explicit parameters, never fall back to currentWeek/currentSeason
      if (!week || !season) {
        console.error('WeeklyPickSelector: Missing week or season for checkWeekStatus:', { week, season })
        return
      }
      
      console.log('WeeklyPickSelector: Checking week status for:', { week, season })
      
      const response = await fetch(`/api/admin/week-status?week=${week}&season=${season}`)
      const data = await response.json()
      
      console.log('WeeklyPickSelector: Week status result:', data)
      
      if (data.isFinalized) {
        console.log('WeeklyPickSelector: Week is finalized - picks locked')
        setWeekFinalized(true)
      } else {
        console.log('WeeklyPickSelector: Week is open for picks')
        setWeekFinalized(false)
      }
    } catch (error) {
      console.error('Error checking week status:', error)
      setWeekFinalized(false) // Default to open if error
    }
  }

  const searchRunningBacks = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/running-backs/search?q=${encodeURIComponent(query)}&week=${currentWeek}&season=${currentSeason}`)
      const data = await response.json()
      
      if (data.runningBacks) {
        setSearchResults(data.runningBacks)
        setShowSearchResults(true)
      }
    } catch (error) {
      console.error('Error searching running backs:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (value.trim()) {
      searchRunningBacks(value)
    } else {
      setSearchResults([])
      setShowSearchResults(false)
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setShowSearchResults(false)
  }

  const handleDeletePick = async () => {
    setDeleting(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/picks?week=${propWeek}&season=${propSeason}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setCurrentPick(null)
        setSelectedPlayer('')
        setError(null)
        // Small delay to ensure deletion completes
        setTimeout(() => {
          onPickSubmitted?.()
        }, 100)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to delete pick')
      }
    } catch (error) {
      console.error('Error deleting pick:', error)
      setError('Failed to delete pick. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const handleSubmitPick = async () => {
    if (!selectedPlayer) return

    setSubmitting(true)
    try {
      // Check both runningBacks and searchResults for the selected player
      let selectedRB = runningBacks.find(rb => rb.id === selectedPlayer)
      if (!selectedRB) {
        selectedRB = searchResults.find(rb => rb.id === selectedPlayer)
      }
      
      if (!selectedRB) {
        setError('Selected player not found. Please try selecting again.')
        return
      }

      const response = await fetch('/api/picks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          week: propWeek,
          season: propSeason,
          player_name: selectedRB.name,
          player_id: selectedRB.player_id,
        }),
      })

      if (response.ok) {
        setSelectedPlayer('')
        setSearchQuery('')
        setSearchResults([])
        setShowSearchResults(false)
        // Refresh the current pick to show the submitted pick
        await fetchCurrentPick(propWeek, propSeason)
        onPickSubmitted?.()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to submit pick')
      }
    } catch (error) {
      console.error('Error submitting pick:', error)
      setError('Failed to submit pick. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Safety check for undefined state
  if (currentWeek === undefined || currentSeason === undefined) {
    console.error('WeeklyPickSelector: Undefined state detected:', { currentWeek, currentSeason })
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Initializing pick selector...</p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Week {currentWeek} Pick</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading running backs...</p>
        </CardContent>
      </Card>
    )
  }

  // If user has already made a pick for this week
  if (currentPick) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Week {currentWeek} Pick</CardTitle>
          <p className="text-sm text-gray-600">
            Your pick for this week
            {weekFinalized && (
              <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                🔒 LOCKED
              </span>
            )}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="font-medium text-green-800">{currentPick.player_name}</div>
            <div className="text-sm text-green-600">{currentPick.yards_gained || 0} yards gained</div>
            <div className="text-xs text-green-500 mt-1">
              Pick submitted on {new Date(currentPick.created_at).toLocaleDateString()}
            </div>
          </div>
          {!weekFinalized ? (
            <Button
              onClick={handleDeletePick}
              disabled={deleting}
              variant="outline"
              className="w-full"
            >
              {deleting ? 'Deleting...' : 'Change Pick'}
            </Button>
          ) : (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              🔒 Week is finalized - no changes allowed
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Week {currentWeek} Pick</CardTitle>
        <p className="text-sm text-gray-600">
          Select one running back for this week
          {weekFinalized && (
            <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
              🔒 LOCKED
            </span>
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}
        {weekFinalized ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-red-800 font-medium">🔒 Week {currentWeek} is Finalized</div>
            <div className="text-red-600 text-sm mt-1">
              No new picks can be made for this week. Games have started and picks are locked.
            </div>
          </div>
        ) : runningBacks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-2">No running back data available</p>
            <p className="text-sm text-gray-500">This could be due to:</p>
            <ul className="text-sm text-gray-500 mt-1 space-y-1">
              <li>• API connection issues</li>
              <li>• No data for this week/season</li>
              <li>• Games not yet scheduled</li>
            </ul>
          </div>
        ) : (
          <>
            {/* Search Bar */}
            <div className="relative">
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search running backs..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  {searchQuery && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Search Results */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-xs text-blue-600 mb-2">
                    Search results ({searchResults.length} found)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {searchResults.map((rb) => (
                      <div
                        key={rb.id}
                        className={`p-2 border rounded transition-colors ${
                          rb.is_locked
                            ? 'border-red-300 bg-red-50 cursor-not-allowed'
                            : selectedPlayer === rb.id
                            ? 'border-blue-500 bg-blue-50 cursor-pointer'
                            : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                        }`}
                        onClick={() => !rb.is_locked && setSelectedPlayer(rb.id)}
                      >
                        <div className="font-medium text-sm">{rb.name}</div>
                        <div className="text-xs text-gray-600">{rb.team}</div>
                        <div className="text-xs text-gray-500">
                          vs {rb.opponent} • {rb.gameTime}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Top Running Backs */}
              <div className="mt-4">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Top 32 Running Backs (2024 Total Yards)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 max-h-64 overflow-y-auto">
                  {runningBacks.map((rb) => (
                    <div
                      key={rb.id}
                      className={`p-2 sm:p-3 border rounded-lg transition-colors ${
                        rb.is_locked
                          ? 'border-red-300 bg-red-50 cursor-not-allowed'
                          : selectedPlayer === rb.id
                          ? 'border-blue-500 bg-blue-50 cursor-pointer'
                          : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                      }`}
                      onClick={() => !rb.is_locked && setSelectedPlayer(rb.id)}
                    >
                      <div className="font-medium text-sm sm:text-base">{rb.name}</div>
                      <div className="text-xs sm:text-sm text-gray-600">{rb.team}</div>
                      <div className="text-xs text-gray-500 space-y-1 mt-1">
                        <div>vs {rb.opponent} • {rb.gameTime}</div>
                        {rb.is_locked && (
                          <div className="text-red-600 font-medium">🔒 LOCKED</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            
              <Button
                onClick={handleSubmitPick}
                disabled={!selectedPlayer || submitting}
                className="w-full"
              >
                {submitting ? 'Submitting...' : 'Submit Pick'}
              </Button>
            </div>
          </>
          )}
        </CardContent>
      </Card>
    )
}
