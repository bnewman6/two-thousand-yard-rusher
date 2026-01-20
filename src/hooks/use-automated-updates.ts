import { useState, useEffect, useCallback } from 'react'

interface UpdateStatus {
  hasLiveGames: boolean
  nextGameTime: string | null
  lastUpdate: string
}

interface UseAutomatedUpdatesProps {
  season: number
  week: number
  enabled?: boolean
}

export function useAutomatedUpdates({ season, week, enabled = true }: UseAutomatedUpdatesProps) {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check update status
  const checkUpdateStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/automated-updates?season=${season}&week=${week}`)
      if (response.ok) {
        const data = await response.json()
        setUpdateStatus(data)
        setError(null)
      } else {
        setError('Failed to check update status')
      }
    } catch (err) {
      setError('Error checking update status')
      console.error('Error checking update status:', err)
    }
  }, [season, week])

  // Trigger player lock updates
  const updatePlayerLocks = useCallback(async () => {
    setIsUpdating(true)
    try {
      const response = await fetch('/api/automated-updates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_player_locks',
          season,
          week,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Player locks updated:', data.message)
        // Trigger a refresh of the leaderboard
        window.dispatchEvent(new CustomEvent('leaderboardRefresh'))
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update player locks')
      }
    } catch (err) {
      setError('Error updating player locks')
      console.error('Error updating player locks:', err)
    } finally {
      setIsUpdating(false)
    }
  }, [season, week])

  // Trigger yard updates for a specific player
  const updatePlayerYards = useCallback(async (playerId: string) => {
    setIsUpdating(true)
    try {
      const response = await fetch('/api/automated-updates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_player_yards',
          season,
          week,
          playerId,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Player yards updated:', data.message)
        // Trigger a refresh of the leaderboard
        window.dispatchEvent(new CustomEvent('leaderboardRefresh'))
        setError(null)
        return data.yards
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update player yards')
      }
    } catch (err) {
      setError('Error updating player yards')
      console.error('Error updating player yards:', err)
    } finally {
      setIsUpdating(false)
    }
  }, [season, week])

  // Trigger yard updates for entire week
  const updateWeekYards = useCallback(async () => {
    setIsUpdating(true)
    try {
      const response = await fetch('/api/automated-updates/selected-players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          season,
          week,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Selected players yards updated:', data.message)
        console.log(`API calls made: ${data.totalApiCalls} (vs ~100+ for all players)`)
        // Trigger a refresh of the leaderboard
        window.dispatchEvent(new CustomEvent('leaderboardRefresh'))
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update selected players yards')
      }
    } catch (err) {
      setError('Error updating selected players yards')
      console.error('Error updating selected players yards:', err)
    } finally {
      setIsUpdating(false)
    }
  }, [season, week])

  // Fallback: Update all players (for admin use)
  const updateAllPlayers = useCallback(async () => {
    setIsUpdating(true)
    try {
      const response = await fetch('/api/automated-updates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_week_yards',
          season,
          week,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log('All players yards updated:', data.message)
        window.dispatchEvent(new CustomEvent('leaderboardRefresh'))
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update all players yards')
      }
    } catch (err) {
      setError('Error updating all players yards')
      console.error('Error updating all players yards:', err)
    } finally {
      setIsUpdating(false)
    }
  }, [season, week])

  // Finalize week
  const finalizeWeek = useCallback(async () => {
    setIsUpdating(true)
    try {
      const response = await fetch('/api/automated-updates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'finalize_week',
          season,
          week,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Week finalized:', data.message)
        // Trigger a refresh of the leaderboard
        window.dispatchEvent(new CustomEvent('leaderboardRefresh'))
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to finalize week')
      }
    } catch (err) {
      setError('Error finalizing week')
      console.error('Error finalizing week:', err)
    } finally {
      setIsUpdating(false)
    }
  }, [season, week])

  // Polling effect
  useEffect(() => {
    if (!enabled) return

    // Initial check
    checkUpdateStatus()

    // Set up optimized polling intervals
    const statusInterval = setInterval(checkUpdateStatus, 60000) // Check every 60 seconds (reduced from 30s)
    const lockInterval = setInterval(updatePlayerLocks, 300000) // Update locks every 5 minutes (reduced from 1m)

    // Smart yard updates based on game status
    let yardsInterval: NodeJS.Timeout | null = null
    if (updateStatus?.hasLiveGames) {
      // During live games, update every 15 minutes for cost optimization
      yardsInterval = setInterval(updateWeekYards, 900000) // Update yards every 15 minutes during live games
    }

    return () => {
      clearInterval(statusInterval)
      clearInterval(lockInterval)
      if (yardsInterval) clearInterval(yardsInterval)
    }
  }, [enabled, season, week, updateStatus?.hasLiveGames, checkUpdateStatus, updatePlayerLocks, updateWeekYards])

  return {
    updateStatus,
    isUpdating,
    error,
    updatePlayerLocks,
    updatePlayerYards,
    updateWeekYards,
    updateAllPlayers,
    finalizeWeek,
    checkUpdateStatus,
  }
}
