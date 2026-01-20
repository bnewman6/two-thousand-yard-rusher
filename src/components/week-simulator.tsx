'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Play, SkipForward, RotateCcw } from 'lucide-react'

interface WeekSimulatorProps {
  currentWeek: number
  currentSeason: number
  onWeekChange?: (week: number, season: number) => void
}

export function WeekSimulator({ currentWeek, currentSeason, onWeekChange }: WeekSimulatorProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const finalizeCurrentWeek = async () => {
    setLoading(true)
    setMessage(null)
    
    try {
      // First, update yards and finalize picks
      const yardsResponse = await fetch('/api/admin/update-yards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          week: currentWeek,
          season: currentSeason,
        }),
      })

      const yardsData = await yardsResponse.json()
      
      if (!yardsResponse.ok) {
        setMessage(`❌ Error updating yards: ${yardsData.error}`)
        return
      }

      // Then, mark the week as finalized
      const statusResponse = await fetch('/api/admin/week-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          week: currentWeek,
          season: currentSeason,
          action: 'finalize',
        }),
      })

      const statusData = await statusResponse.json()
      
      if (statusResponse.ok) {
        setMessage(`✅ Week ${currentWeek} finalized! ${yardsData.updates?.length || 0} picks updated and locked.`)
        // Trigger leaderboard refresh
        window.dispatchEvent(new CustomEvent('leaderboardRefresh'))
        // Trigger page refresh to update pick selector
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        setMessage(`❌ Error finalizing week: ${statusData.error}`)
      }
    } catch (error) {
      console.error('Error finalizing week:', error)
      setMessage('❌ Failed to finalize week')
    } finally {
      setLoading(false)
    }
  }

  const advanceToNextWeek = () => {
    const nextWeek = currentWeek + 1
    if (nextWeek <= 18) { // NFL regular season is 18 weeks
      // Update localStorage for the NFL API
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentWeek', nextWeek.toString())
        localStorage.setItem('currentSeason', currentSeason.toString())
        console.log('WeekSimulator: Updated localStorage to:', { week: nextWeek, season: currentSeason })
      }
      onWeekChange?.(nextWeek, currentSeason)
      setMessage(`📅 Advanced to Week ${nextWeek}`)
    }
  }

  const resetToWeek1 = () => {
    // Update localStorage for the NFL API
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentWeek', '1')
      localStorage.setItem('currentSeason', currentSeason.toString())
      console.log('WeekSimulator: Reset localStorage to:', { week: 1, season: currentSeason })
    }
    onWeekChange?.(1, currentSeason)
    setMessage('🔄 Reset to Week 1')
  }

  const resetSeason = async () => {
    setLoading(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/admin/reset-season', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      
      if (response.ok) {
        setMessage(`✅ Season reset! All picks deleted and yards reset to 0.`)
        // Reset to Week 1 immediately
        if (typeof window !== 'undefined') {
          localStorage.setItem('currentWeek', '1')
          localStorage.setItem('currentSeason', currentSeason.toString())
          console.log('WeekSimulator: Reset localStorage to Week 1 after season reset')
        }
        // Update the component state immediately
        onWeekChange?.(1, currentSeason)
        // Trigger leaderboard refresh
        window.dispatchEvent(new CustomEvent('leaderboardRefresh'))
        // Trigger page refresh to update all components
        setTimeout(() => {
          window.location.reload()
        }, 2000) // Increased delay to ensure state updates are processed
      } else {
        setMessage(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error resetting season:', error)
      setMessage('❌ Failed to reset season')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="text-orange-800">🧪 Testing Simulator</CardTitle>
        <p className="text-sm text-orange-600">
          Current: Week {currentWeek}, Season {currentSeason}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {message && (
          <div className={`p-3 rounded-md text-sm ${
            message.includes('✅') ? 'bg-green-100 text-green-800' :
            message.includes('❌') ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {message}
          </div>
        )}
        
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={finalizeCurrentWeek}
            disabled={loading}
            className="flex items-center space-x-2"
            variant="default"
          >
            <Play className="h-4 w-4" />
            <span>{loading ? 'Finalizing...' : 'Finalize Week'}</span>
          </Button>
          
          <Button
            onClick={advanceToNextWeek}
            disabled={currentWeek >= 18}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <SkipForward className="h-4 w-4" />
            <span>Next Week</span>
          </Button>
          
          <Button
            onClick={resetToWeek1}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset to Week 1</span>
          </Button>

          <Button
            onClick={resetSeason}
            disabled={loading}
            variant="destructive"
            className="flex items-center space-x-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span>{loading ? 'Resetting...' : 'Reset Season'}</span>
          </Button>
        </div>
        
        <div className="text-xs text-orange-600 space-y-1">
          <p><strong>Finalize Week:</strong> Simulates games ending and adds yards to totals</p>
          <p><strong>Next Week:</strong> Advances to the next week for new picks</p>
          <p><strong>Reset to Week 1:</strong> Goes back to Week 1 (for testing)</p>
          <p><strong>Reset Season:</strong> Deletes all picks and resets total yards to 0</p>
        </div>
      </CardContent>
    </Card>
  )
}
