'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

interface PlayerData {
  player_id: string
  name: string
  team: string
  yards: number
  games_played: number
  is_locked: boolean
  game_start_time: string
  opponent: string
  gameTime: string
}

interface ManualDataEntryProps {
  week: number
  season: number
}

export default function ManualDataEntry({ week, season }: ManualDataEntryProps) {
  const [players, setPlayers] = useState<PlayerData[]>([
    {
      player_id: '',
      name: '',
      team: '',
      yards: 0,
      games_played: 1,
      is_locked: true,
      game_start_time: '',
      opponent: '',
      gameTime: 'Final'
    }
  ])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const addPlayer = () => {
    setPlayers([...players, {
      player_id: '',
      name: '',
      team: '',
      yards: 0,
      games_played: 1,
      is_locked: true,
      game_start_time: '',
      opponent: '',
      gameTime: 'Final'
    }])
  }

  const removePlayer = (index: number) => {
    setPlayers(players.filter((_, i) => i !== index))
  }

  const updatePlayer = (index: number, field: keyof PlayerData, value: any) => {
    const updatedPlayers = [...players]
    updatedPlayers[index] = { ...updatedPlayers[index], [field]: value }
    setPlayers(updatedPlayers)
  }

  const submitData = async () => {
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/admin/manual-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'bulk_update_week',
          week,
          season,
          playerData: players.filter(p => p.name && p.team && p.player_id)
        })
      })

      const result = await response.json()

      if (result.success) {
        setMessage('✅ Data saved successfully!')
        // Clear the form
        setPlayers([{
          player_id: '',
          name: '',
          team: '',
          yards: 0,
          games_played: 1,
          is_locked: true,
          game_start_time: '',
          opponent: '',
          gameTime: 'Final'
        }])
      } else {
        setMessage(`❌ Error: ${result.error}`)
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Manual Data Entry - Week {week} {season}</h2>
      
      {message && (
        <div className={`p-3 rounded mb-4 ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}

      <div className="space-y-4">
        {players.map((player, index) => (
          <div key={index} className="border p-4 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Player {index + 1}</h3>
              {players.length > 1 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => removePlayer(index)}
                >
                  Remove
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label htmlFor={`player_id_${index}`}>Player ID</Label>
                <Input
                  id={`player_id_${index}`}
                  value={player.player_id}
                  onChange={(e) => updatePlayer(index, 'player_id', e.target.value)}
                  placeholder="e.g., eagles-rb1"
                />
              </div>
              
              <div>
                <Label htmlFor={`name_${index}`}>Name</Label>
                <Input
                  id={`name_${index}`}
                  value={player.name}
                  onChange={(e) => updatePlayer(index, 'name', e.target.value)}
                  placeholder="e.g., Saquon Barkley"
                />
              </div>
              
              <div>
                <Label htmlFor={`team_${index}`}>Team</Label>
                <Input
                  id={`team_${index}`}
                  value={player.team}
                  onChange={(e) => updatePlayer(index, 'team', e.target.value)}
                  placeholder="e.g., PHI"
                />
              </div>
              
              <div>
                <Label htmlFor={`yards_${index}`}>Rushing Yards</Label>
                <Input
                  id={`yards_${index}`}
                  type="number"
                  value={player.yards}
                  onChange={(e) => updatePlayer(index, 'yards', parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              
              <div>
                <Label htmlFor={`opponent_${index}`}>Opponent</Label>
                <Input
                  id={`opponent_${index}`}
                  value={player.opponent}
                  onChange={(e) => updatePlayer(index, 'opponent', e.target.value)}
                  placeholder="e.g., DAL"
                />
              </div>
              
              <div>
                <Label htmlFor={`gameTime_${index}`}>Game Time</Label>
                <Input
                  id={`gameTime_${index}`}
                  value={player.gameTime}
                  onChange={(e) => updatePlayer(index, 'gameTime', e.target.value)}
                  placeholder="e.g., Final - W 24-20"
                />
              </div>
              
              <div>
                <Label htmlFor={`game_start_time_${index}`}>Game Start Time</Label>
                <Input
                  id={`game_start_time_${index}`}
                  type="datetime-local"
                  value={player.game_start_time}
                  onChange={(e) => updatePlayer(index, 'game_start_time', e.target.value)}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`is_locked_${index}`}
                  checked={player.is_locked}
                  onChange={(e) => updatePlayer(index, 'is_locked', e.target.checked)}
                />
                <Label htmlFor={`is_locked_${index}`}>Game Locked</Label>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex space-x-3 mt-6">
        <Button onClick={addPlayer} variant="outline">
          Add Player
        </Button>
        <Button onClick={submitData} disabled={loading}>
          {loading ? 'Saving...' : 'Save Data'}
        </Button>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Instructions:</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li>Enter the actual rushing yards from the games</li>
          <li>Use proper team abbreviations (PHI, DAL, KC, LAC, etc.)</li>
          <li>Set game start time in your local timezone</li>
          <li>Mark games as locked if they're completed</li>
          <li>This data will be used instead of API data when available</li>
        </ul>
      </div>
    </Card>
  )
}
