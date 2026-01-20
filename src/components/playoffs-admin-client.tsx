'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PlayoffPlayer, PlayerPosition } from '@/types'
import { Save, Plus, Trash2, Search, Upload } from 'lucide-react'
import { PlayoffsAdminTeamManager } from './playoffs-admin-team-manager'

// Format points with 2 decimals, trimming trailing zeros
const formatPoints = (points: number | string): string => {
  const num = typeof points === 'string' ? parseFloat(points) : points
  // Use toFixed(2) to ensure 2 decimal places, then parseFloat removes trailing zeros
  return parseFloat(num.toFixed(2)).toString()
}

export function PlayoffsAdminClient() {
  const [players, setPlayers] = useState<PlayoffPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showTeamImport, setShowTeamImport] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importingTeams, setImportingTeams] = useState(false)
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [teamImportMessage, setTeamImportMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  // Track pending edits for each player (not saved to DB yet)
  const [pendingEdits, setPendingEdits] = useState<Record<string, Partial<PlayoffPlayer>>>({})
  const [newPlayer, setNewPlayer] = useState({
    name: '',
    position: 'QB' as PlayerPosition,
    nfl_team: '',
    passing_yds: 0,
    passing_td: 0,
    int: 0,
    rush_yds: 0,
    rush_td: 0,
    rec: 0,
    rec_yds: 0,
    rec_td: 0,
    fum: 0,
    kicking_pts: 0,
    eliminated: false
  })

  useEffect(() => {
    fetchPlayers()
  }, [])

  const fetchPlayers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/playoffs/players')
      const data = await response.json()
      if (data.players) {
        setPlayers(data.players)
        // Reset pending edits when fetching fresh data
        setPendingEdits({})
      }
    } catch (error) {
      console.error('Error fetching players:', error)
    } finally {
      setLoading(false)
    }
  }

  // Update local pending edits (not saved to DB yet)
  const handleLocalEdit = (playerId: string, field: keyof PlayoffPlayer, value: any) => {
    setPendingEdits(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: value
      }
    }))
  }

  // Handle number input - clears 0 when user starts typing
  const handleNumberInput = (playerId: string, field: keyof PlayoffPlayer, currentValue: number, inputValue: string) => {
    const numValue = parseInt(inputValue) || 0

    // If current value is 0 and user typed a digit (input becomes "0X"), replace with just the digit
    if (currentValue === 0 && inputValue.length === 2 && inputValue.startsWith('0') && !isNaN(parseInt(inputValue[1]))) {
      handleLocalEdit(playerId, field, parseInt(inputValue[1]))
    } else {
      handleLocalEdit(playerId, field, numValue)
    }
  }

  // Handle float input (for kicking points) - clears 0 when user starts typing
  const handleFloatInput = (playerId: string, field: keyof PlayoffPlayer, currentValue: number, inputValue: string) => {
    const floatValue = parseFloat(inputValue) || 0

    // If current value is 0 and user typed a digit (input becomes "0X"), replace with just the digit
    if (currentValue === 0 && inputValue.length === 2 && inputValue.startsWith('0') && !isNaN(parseFloat(inputValue[1]))) {
      handleLocalEdit(playerId, field, parseFloat(inputValue[1]))
    } else {
      handleLocalEdit(playerId, field, floatValue)
    }
  }

  // Save pending edits for a specific player
  const handleSavePlayer = async (playerId: string) => {
    const edits = pendingEdits[playerId]
    if (!edits || Object.keys(edits).length === 0) {
      // No pending edits to save
      return
    }

    setSaving(prev => ({ ...prev, [playerId]: true }))
    try {
      const response = await fetch('/api/playoffs/players', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: playerId,
          ...edits
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update player')
      }

      // Clear pending edits for this player and refresh
      setPendingEdits(prev => {
        const newEdits = { ...prev }
        delete newEdits[playerId]
        return newEdits
      })
      await fetchPlayers()
    } catch (error) {
      console.error('Error updating player:', error)
      alert('Failed to update player. Please try again.')
    } finally {
      setSaving(prev => ({ ...prev, [playerId]: false }))
    }
  }

  const handleUpdatePlayer = async (playerId: string, updates: Partial<PlayoffPlayer>) => {
    setSaving(prev => ({ ...prev, [playerId]: true }))
    try {
      const response = await fetch('/api/playoffs/players', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: playerId,
          ...updates
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update player')
      }

      // Refresh players list
      await fetchPlayers()
    } catch (error) {
      console.error('Error updating player:', error)
      alert('Failed to update player. Please try again.')
    } finally {
      setSaving(prev => ({ ...prev, [playerId]: false }))
    }
  }

  const handleAddPlayer = async () => {
    if (!newPlayer.name || !newPlayer.position || !newPlayer.nfl_team) {
      alert('Please fill in name, position, and NFL team')
      return
    }

    setSaving({ adding: true })
    try {
      const response = await fetch('/api/playoffs/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPlayer)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add player')
      }

      // Reset form and refresh
      setNewPlayer({
        name: '',
        position: 'QB',
        nfl_team: '',
        passing_yds: 0,
        passing_td: 0,
        int: 0,
        rush_yds: 0,
        rush_td: 0,
        rec: 0,
        rec_yds: 0,
        rec_td: 0,
        fum: 0,
        kicking_pts: 0,
        eliminated: false
      })
      setShowAddForm(false)
      await fetchPlayers()
    } catch (error) {
      console.error('Error adding player:', error)
      alert('Failed to add player. Please try again.')
    } finally {
      setSaving({})
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportMessage(null)

    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())

      if (lines.length < 2) {
        throw new Error('CSV file must have at least a header row and one data row')
      }

      // Parse CSV header
      const headerLine = lines[0]
      const headers = parseCSVLine(headerLine).map((h: string) => h.trim())

      // Parse data rows
      const players = []
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i])
        const player: any = {}

        headers.forEach((header, index) => {
          player[header] = values[index]?.trim() || ''
        })

        if (player.name || player['Player Name'] || player.Name) {
          players.push(player)
        }
      }

      if (players.length === 0) {
        throw new Error('No valid players found in CSV file')
      }

      // Import players
      const response = await fetch('/api/playoffs/players/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import players')
      }

      setImportMessage({
        type: 'success',
        text: `Successfully imported ${data.inserted} players${data.errors ? ` (with ${data.errors.length} errors)` : ''}`
      })

      // Refresh players list
      await fetchPlayers()
      setShowImport(false)

      // Clear file input
      e.target.value = ''
    } catch (error: any) {
      setImportMessage({
        type: 'error',
        text: error.message || 'Failed to import players. Please check your CSV format.'
      })
    } finally {
      setImporting(false)
    }
  }

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }

    result.push(current)
    return result
  }

  const handleTeamFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportingTeams(true)
    setTeamImportMessage(null)

    try {
      const text = await file.text()

      // Import teams via API
      const response = await fetch('/api/playoffs/teams/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: text })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import teams')
      }

      setTeamImportMessage({
        type: 'success',
        text: `Successfully imported ${data.inserted} teams${data.errors ? ` (with ${data.errors.length} errors)` : ''}`
      })

      if (data.errors && data.errors.length > 0) {
        console.error('Team import errors:', data.errors)
        // Show errors in a more detailed way
        setTeamImportMessage({
          type: 'error',
          text: `Imported ${data.inserted} teams. Errors: ${data.errors.slice(0, 5).join('; ')}${data.errors.length > 5 ? ` (and ${data.errors.length - 5} more)` : ''}`
        })
      }

      setShowTeamImport(false)

      // Clear file input
      e.target.value = ''
    } catch (error: any) {
      setTeamImportMessage({
        type: 'error',
        text: error.message || 'Failed to import teams. Please check your CSV format.'
      })
    } finally {
      setImportingTeams(false)
    }
  }

  // Get current value for a field (pending edit or original value)
  const getFieldValue = (player: PlayoffPlayer, field: keyof PlayoffPlayer): any => {
    const edits = pendingEdits[player.id]
    if (edits && field in edits) {
      return edits[field]
    }
    return player[field]
  }

  // Check if a player has pending edits
  const hasPendingEdits = (playerId: string): boolean => {
    const edits = pendingEdits[playerId]
    return edits ? Object.keys(edits).length > 0 : false
  }

  const filteredPlayers = players.filter(player => {
    const query = searchQuery.toLowerCase()
    return player.name.toLowerCase().includes(query) ||
      player.nfl_team.toLowerCase().includes(query) ||
      player.position.toLowerCase().includes(query)
  })

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <p className="text-gray-900">Loading players...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Admin Panel
        </h1>
        <p className="text-sm text-gray-700">
          Manage players and teams for the playoffs fantasy challenge.
        </p>
      </div>

      <Tabs defaultValue="players" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="players" className="text-gray-900">Players Manager</TabsTrigger>
          <TabsTrigger value="teams" className="text-gray-900">Teams Manager</TabsTrigger>
        </TabsList>

        <TabsContent value="players">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Manage Players
            </h2>
            <p className="text-sm text-gray-700">
              Add and update player statistics. Points are calculated automatically using PPR scoring.
            </p>
          </div>

      {/* Search and Add Button */}
      <div className="mb-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-700" />
          <Input
            type="text"
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white text-gray-900 placeholder:text-gray-500"
          />
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 text-gray-900 border border-gray-300"
        >
          <Plus className="h-4 w-4" />
          Add Player
        </Button>
        <Button
          onClick={() => {
            setShowImport(!showImport)
            setImportMessage(null)
          }}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Import Players
        </Button>
        <Button
          onClick={() => {
            setShowTeamImport(!showTeamImport)
            setTeamImportMessage(null)
          }}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Import Teams
        </Button>
      </div>

      {/* CSV Import Section */}
      {showImport && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-gray-900">Import Players from CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="csv-file" className="text-gray-900">Select CSV File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={importing}
                className="mt-2 bg-white text-gray-900"
              />
            </div>

            {importMessage && (
              <div className={`p-3 rounded ${importMessage.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                {importMessage.text}
              </div>
            )}

            <div className="text-sm text-gray-800 space-y-2">
              <p className="font-semibold">Expected CSV Format:</p>
              <p>Your CSV should have headers in the first row. Supported column names include:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Name/Player Name:</strong> Player name (required)</li>
                <li><strong>Position:</strong> QB, RB, WR, TE, or K (required)</li>
                <li><strong>NFL Team/Team:</strong> Team abbreviation (required)</li>
                <li><strong>Eliminated:</strong> Y/N or true/false</li>
                <li><strong>Passing YDS/Pass YDS:</strong> Passing yards</li>
                <li><strong>Passing TD/Pass TD:</strong> Passing touchdowns</li>
                <li><strong>INT:</strong> Interceptions</li>
                <li><strong>Rush YDS/Rushing YDS:</strong> Rushing yards</li>
                <li><strong>Rush TD/Rushing TD:</strong> Rushing touchdowns</li>
                <li><strong>REC/Receptions:</strong> Receptions</li>
                <li><strong>REC YDS/Receiving YDS:</strong> Receiving yards</li>
                <li><strong>REC TD/Receiving TD:</strong> Receiving touchdowns</li>
                <li><strong>FUM/Fumbles:</strong> Fumbles</li>
                <li><strong>Kicking/Kicking PTS:</strong> Kicking points</li>
              </ul>
              <p className="mt-2"><strong>Tip:</strong> Export from Google Sheets as CSV (File → Download → Comma-separated values)</p>
            </div>

            {importing && (
              <div className="text-center py-4">
                <p className="text-gray-900">Importing players...</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Team Import Section */}
      {showTeamImport && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-gray-900">Import Teams from CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="team-csv-file" className="text-gray-900">Select Teams CSV File</Label>
              <Input
                id="team-csv-file"
                type="file"
                accept=".csv"
                onChange={handleTeamFileUpload}
                disabled={importingTeams}
                className="mt-2 bg-white text-gray-900"
              />
            </div>

            {teamImportMessage && (
              <div className={`p-3 rounded ${teamImportMessage.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                {teamImportMessage.text}
              </div>
            )}

            <div className="text-sm text-gray-800 space-y-2">
              <p className="font-semibold">Expected CSV Format:</p>
              <p>Your CSV header row should contain the actual team names (not "Team 1", "Team 2", etc.)</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Row 1:</strong> Headers are the team names (e.g., "My Team", "Another Team", etc.)</li>
                <li><strong>Row 2:</strong> Points row (optional - may contain point totals or be empty)</li>
                <li><strong>Rows 3-19:</strong> 17 players per team (one player per row)</li>
              </ul>
              <p className="mt-1 text-xs"><strong>Note:</strong> "Pts" columns will be automatically ignored. Only columns with team names will be imported.</p>
              <p className="mt-2"><strong>Player Order:</strong> QB1, QB2, QB3, RB1, RB2, RB3, WR1, WR2, WR3, WR4, TE1, TE2, K1, K2, FLEX1, FLEX2, FLEX3</p>
              <p className="mt-2"><strong>Tip:</strong> Export from Google Sheets as CSV (File → Download → Comma-separated values)</p>
              <p className="mt-2 text-xs"><strong>Note:</strong> Players are matched by name (case-insensitive). Make sure player names in your CSV exactly match the names in the Players table.</p>
            </div>

            {importingTeams && (
              <div className="text-center py-4">
                <p className="text-gray-900">Importing teams...</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Player Form */}
      {showAddForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-gray-900">Add New Player</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-900">Name *</Label>
                <Input
                  value={newPlayer.name}
                  onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                  placeholder="Player name"
                  className="bg-white text-gray-900 placeholder:text-gray-500"
                />
              </div>
              <div>
                <Label className="text-gray-900">Position *</Label>
                <select
                  value={newPlayer.position}
                  onChange={(e) => setNewPlayer({ ...newPlayer, position: e.target.value as PlayerPosition })}
                  className="h-9 w-full rounded-md border border-gray-300 bg-transparent px-3 text-sm text-gray-900"
                >
                  <option value="QB">QB</option>
                  <option value="RB">RB</option>
                  <option value="WR">WR</option>
                  <option value="TE">TE</option>
                  <option value="K">K</option>
                </select>
              </div>
              <div>
                <Label className="text-gray-900">NFL Team *</Label>
                <Input
                  value={newPlayer.nfl_team}
                  onChange={(e) => setNewPlayer({ ...newPlayer, nfl_team: e.target.value.toUpperCase() })}
                  placeholder="Team abbreviation"
                  className="bg-white text-gray-900 placeholder:text-gray-500"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={handleAddPlayer} disabled={saving.adding} className="text-gray-900">
                {saving.adding ? 'Adding...' : 'Add Player'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Players List */}
      <div className="space-y-4">
        {filteredPlayers.map(player => (
          <Card key={player.id}>
            <CardContent className="pt-6">
              {/* Header with Save Button */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="font-semibold text-lg text-gray-900">{player.name}</div>
                  <div className="text-sm text-gray-800">{player.position} - {player.nfl_team}</div>
                </div>
                <Button
                  onClick={() => handleSavePlayer(player.id)}
                  disabled={saving[player.id] || !hasPendingEdits(player.id)}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving[player.id] ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Player Info */}
                <div className="lg:col-span-3">
                  <div className="mt-2">
                    <Label className="text-xs text-gray-900">Eliminated</Label>
                    <input
                      type="checkbox"
                      checked={getFieldValue(player, 'eliminated') as boolean}
                      onChange={(e) => handleLocalEdit(player.id, 'eliminated', e.target.checked)}
                      className="ml-2"
                    />
                  </div>
                  <div className="mt-2 text-lg font-bold text-blue-600">
                    {formatPoints(player.tot_pts)} PTS
                  </div>
                </div>

                {/* Stats - Show ALL fields for ALL players in admin */}
                <div className="lg:col-span-9 grid grid-cols-2 md:grid-cols-5 gap-4">
                  {/* Passing Stats */}
                  <div>
                    <Label className="text-xs text-gray-900">Passing YDS</Label>
                    <Input
                      type="number"
                      value={getFieldValue(player, 'passing_yds')}
                      onChange={(e) => handleNumberInput(player.id, 'passing_yds', getFieldValue(player, 'passing_yds') as number, e.target.value)}
                      onFocus={(e) => {
                        const val = getFieldValue(player, 'passing_yds')
                        if (val === 0) {
                          e.target.select()
                        }
                      }}
                      className="text-sm bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-900">Passing TD</Label>
                    <Input
                      type="number"
                      value={getFieldValue(player, 'passing_td')}
                      onChange={(e) => handleNumberInput(player.id, 'passing_td', getFieldValue(player, 'passing_td') as number, e.target.value)}
                      onFocus={(e) => {
                        const val = getFieldValue(player, 'passing_td')
                        if (val === 0) {
                          e.target.select()
                        }
                      }}
                      className="text-sm bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-900">INT</Label>
                    <Input
                      type="number"
                      value={getFieldValue(player, 'int')}
                      onChange={(e) => handleNumberInput(player.id, 'int', getFieldValue(player, 'int') as number, e.target.value)}
                      onFocus={(e) => {
                        const val = getFieldValue(player, 'int')
                        if (val === 0) {
                          e.target.select()
                        }
                      }}
                      className="text-sm bg-white text-gray-900"
                    />
                  </div>

                  {/* Rushing Stats */}
                  <div>
                    <Label className="text-xs text-gray-900">Rush YDS</Label>
                    <Input
                      type="number"
                      value={getFieldValue(player, 'rush_yds')}
                      onChange={(e) => handleNumberInput(player.id, 'rush_yds', getFieldValue(player, 'rush_yds') as number, e.target.value)}
                      onFocus={(e) => {
                        const val = getFieldValue(player, 'rush_yds')
                        if (val === 0) {
                          e.target.select()
                        }
                      }}
                      className="text-sm bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-900">Rush TD</Label>
                    <Input
                      type="number"
                      value={getFieldValue(player, 'rush_td')}
                      onChange={(e) => handleNumberInput(player.id, 'rush_td', getFieldValue(player, 'rush_td') as number, e.target.value)}
                      onFocus={(e) => {
                        const val = getFieldValue(player, 'rush_td')
                        if (val === 0) {
                          e.target.select()
                        }
                      }}
                      className="text-sm bg-white text-gray-900"
                    />
                  </div>

                  {/* Receiving Stats */}
                  <div>
                    <Label className="text-xs text-gray-900">Receptions</Label>
                    <Input
                      type="number"
                      value={getFieldValue(player, 'rec')}
                      onChange={(e) => handleNumberInput(player.id, 'rec', getFieldValue(player, 'rec') as number, e.target.value)}
                      onFocus={(e) => {
                        const val = getFieldValue(player, 'rec')
                        if (val === 0) {
                          e.target.select()
                        }
                      }}
                      className="text-sm bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-900">Rec YDS</Label>
                    <Input
                      type="number"
                      value={getFieldValue(player, 'rec_yds')}
                      onChange={(e) => handleNumberInput(player.id, 'rec_yds', getFieldValue(player, 'rec_yds') as number, e.target.value)}
                      onFocus={(e) => {
                        const val = getFieldValue(player, 'rec_yds')
                        if (val === 0) {
                          e.target.select()
                        }
                      }}
                      className="text-sm bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-900">Rec TD</Label>
                    <Input
                      type="number"
                      value={getFieldValue(player, 'rec_td')}
                      onChange={(e) => handleNumberInput(player.id, 'rec_td', getFieldValue(player, 'rec_td') as number, e.target.value)}
                      onFocus={(e) => {
                        const val = getFieldValue(player, 'rec_td')
                        if (val === 0) {
                          e.target.select()
                        }
                      }}
                      className="text-sm bg-white text-gray-900"
                    />
                  </div>

                  {/* Fumbles */}
                  <div>
                    <Label className="text-xs text-gray-900">Fumbles</Label>
                    <Input
                      type="number"
                      value={getFieldValue(player, 'fum')}
                      onChange={(e) => handleNumberInput(player.id, 'fum', getFieldValue(player, 'fum') as number, e.target.value)}
                      onFocus={(e) => {
                        const val = getFieldValue(player, 'fum')
                        if (val === 0) {
                          e.target.select()
                        }
                      }}
                      className="text-sm bg-white text-gray-900"
                    />
                  </div>

                  {/* Kicking Stats */}
                  <div>
                    <Label className="text-xs text-gray-900">Kicking Points</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={getFieldValue(player, 'kicking_pts')}
                      onChange={(e) => handleFloatInput(player.id, 'kicking_pts', getFieldValue(player, 'kicking_pts') as number, e.target.value)}
                      onFocus={(e) => {
                        const val = getFieldValue(player, 'kicking_pts')
                        if (val === 0) {
                          e.target.select()
                        }
                      }}
                      className="text-sm bg-white text-gray-900"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPlayers.length === 0 && (
        <div className="text-center py-8 text-gray-900">
          No players found. {searchQuery && 'Try adjusting your search.'}
        </div>
      )}
        </TabsContent>

        <TabsContent value="teams">
          <PlayoffsAdminTeamManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}

