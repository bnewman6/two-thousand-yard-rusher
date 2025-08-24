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
        console.log('Week yards updated:', data.message)
        // Trigger a refresh of the leaderboard
        window.dispatchEvent(new CustomEvent('leaderboardRefresh'))
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update week yards')
      }
    } catch (err) {
      setError('Error updating week yards')
      console.error('Error updating week yards:', err)
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

    // Set up polling intervals
    const statusInterval = setInterval(checkUpdateStatus, 30000) // Check every 30 seconds
    const lockInterval = setInterval(updatePlayerLocks, 60000) // Update locks every minute

    // If there are live games, update yards more frequently
    let yardsInterval: NodeJS.Timeout | null = null
    if (updateStatus?.hasLiveGames) {
      yardsInterval = setInterval(updateWeekYards, 30000) // Update yards every 30 seconds during live games
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
    finalizeWeek,
    checkUpdateStatus,
  }
}
