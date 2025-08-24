'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  RefreshCw, 
  Lock, 
  Unlock, 
  Play, 
  Square, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { useAutomatedUpdates } from '@/hooks/use-automated-updates'

interface AutomatedUpdatesPanelProps {
  season: number
  week: number
}

export function AutomatedUpdatesPanel({ season, week }: AutomatedUpdatesPanelProps) {
  const {
    updateStatus,
    isUpdating,
    error,
    updatePlayerLocks,
    updatePlayerYards,
    updateWeekYards,
    finalizeWeek,
    checkUpdateStatus,
  } = useAutomatedUpdates({ season, week })

  const [manualPlayerId, setManualPlayerId] = useState('')

  const formatNextGameTime = (timeString: string | null) => {
    if (!timeString) return 'No upcoming games'
    
    const gameTime = new Date(timeString)
    const now = new Date()
    const diffMs = gameTime.getTime() - now.getTime()
    
    if (diffMs <= 0) return 'Game starting now'
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m until next game`
    } else {
      return `${diffMinutes}m until next game`
    }
  }

  const getStatusIcon = () => {
    if (isUpdating) return <Loader2 className="h-4 w-4 animate-spin" />
    if (error) return <AlertCircle className="h-4 w-4 text-red-500" />
    if (updateStatus?.hasLiveGames) return <Play className="h-4 w-4 text-green-500" />
    return <CheckCircle className="h-4 w-4 text-blue-500" />
  }

  const getStatusText = () => {
    if (isUpdating) return 'Updating...'
    if (error) return 'Error occurred'
    if (updateStatus?.hasLiveGames) return 'Live games detected'
    return 'All systems operational'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {getStatusIcon()}
          <span>Automated Updates</span>
          <Badge variant={updateStatus?.hasLiveGames ? 'default' : 'secondary'}>
            {updateStatus?.hasLiveGames ? 'LIVE' : 'IDLE'}
          </Badge>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Week {week} • Season {season} • {getStatusText()}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-sm font-medium text-blue-900">Next Game</div>
                <div className="text-xs text-blue-600">
                  {formatNextGameTime(updateStatus?.nextGameTime || null)}
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-sm font-medium text-green-900">Last Update</div>
                <div className="text-xs text-green-600">
                  {updateStatus?.lastUpdate 
                    ? new Date(updateStatus.lastUpdate).toLocaleTimeString()
                    : 'Never'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Manual Controls */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Manual Controls</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              onClick={updatePlayerLocks}
              disabled={isUpdating}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <Lock className="h-4 w-4" />
              <span>Update Locks</span>
            </Button>
            
            <Button
              onClick={updateWeekYards}
              disabled={isUpdating}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Update Yards</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              onClick={checkUpdateStatus}
              disabled={isUpdating}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <Clock className="h-4 w-4" />
              <span>Check Status</span>
            </Button>
            
            <Button
              onClick={finalizeWeek}
              disabled={isUpdating}
              variant="destructive"
              size="sm"
              className="flex items-center space-x-2"
            >
              <Square className="h-4 w-4" />
              <span>Finalize Week</span>
            </Button>
          </div>

          {/* Individual Player Update */}
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Player ID for manual update"
              value={manualPlayerId}
              onChange={(e) => setManualPlayerId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <Button
              onClick={() => {
                if (manualPlayerId.trim()) {
                  updatePlayerYards(manualPlayerId.trim())
                  setManualPlayerId('')
                }
              }}
              disabled={isUpdating || !manualPlayerId.trim()}
              variant="outline"
              size="sm"
            >
              Update Player
            </Button>
          </div>
        </div>

        {/* Auto-Update Status */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Auto-Update Schedule</h5>
          <div className="text-xs text-gray-600 space-y-1">
            <div>• Status check: Every 30 seconds</div>
            <div>• Player locks: Every 60 seconds</div>
            <div>• Yard updates: Every 30 seconds (during live games)</div>
            <div>• Manual controls available for immediate updates</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
