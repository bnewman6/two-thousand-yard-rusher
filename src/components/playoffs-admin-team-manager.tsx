'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FantasyTeamWithPlayers, PositionSlot, PlayoffPlayer } from '@/types'
import { Save, Plus, Trash2, Search, Upload, Edit2, X } from 'lucide-react'

const POSITION_SLOTS: PositionSlot[] = [
    'QB1', 'QB2', 'QB3',
    'RB1', 'RB2', 'RB3',
    'WR1', 'WR2', 'WR3', 'WR4',
    'TE1', 'TE2',
    'K1', 'K2',
    'FLEX1', 'FLEX2', 'FLEX3'
]

// Format points with 2 decimals, trimming trailing zeros
const formatPoints = (points: number | string): string => {
    const num = typeof points === 'string' ? parseFloat(points) : points
    return parseFloat(num.toFixed(2)).toString()
}

export function PlayoffsAdminTeamManager() {
    const [teams, setTeams] = useState<FantasyTeamWithPlayers[]>([])
    const [players, setPlayers] = useState<PlayoffPlayer[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<Record<string, boolean>>({})
    const [searchQuery, setSearchQuery] = useState('')
    const [showAddForm, setShowAddForm] = useState(false)
    const [showTeamImport, setShowTeamImport] = useState(false)
    const [importingTeams, setImportingTeams] = useState(false)
    const [teamImportMessage, setTeamImportMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [editingTeam, setEditingTeam] = useState<string | null>(null)
    const [pendingEdits, setPendingEdits] = useState<Record<string, { team_name?: string; players?: Record<PositionSlot, string | null> }>>({})

    const [newTeam, setNewTeam] = useState({
        team_name: '',
        players: {} as Record<PositionSlot, string | null>
    })

    useEffect(() => {
        fetchTeams()
        fetchPlayers()
    }, [])

    const fetchTeams = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/playoffs/teams?include_players=true')
            const data = await response.json()
            if (data.teams) {
                setTeams(data.teams)
            }
        } catch (error) {
            console.error('Error fetching teams:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchPlayers = async () => {
        try {
            const response = await fetch('/api/playoffs/players')
            const data = await response.json()
            if (data.players) {
                setPlayers(data.players)
            }
        } catch (error) {
            console.error('Error fetching players:', error)
        }
    }

    const filteredTeams = teams.filter(team => {
        const query = searchQuery.toLowerCase()
        return team.team_name.toLowerCase().includes(query)
    })

    const handleLocalEdit = (teamId: string, field: 'team_name' | 'players', value: any) => {
        setPendingEdits(prev => ({
            ...prev,
            [teamId]: {
                ...prev[teamId],
                [field]: value
            }
        }))
    }

    const handleSaveTeam = async (teamId: string) => {
        const edits = pendingEdits[teamId]
        if (!edits || Object.keys(edits).length === 0) {
            return
        }

        setSaving(prev => ({ ...prev, [teamId]: true }))
        try {
            const updates: any = {}

            if (edits.team_name !== undefined) {
                updates.team_name = edits.team_name
            }

            if (edits.players) {
                // Convert player names to player IDs
                const playerIds: { player_id: string; position_slot: PositionSlot }[] = []

                for (const [slot, playerName] of Object.entries(edits.players)) {
                    if (playerName) {
                        const player = players.find(p => p.name.toLowerCase() === playerName.toLowerCase())
                        if (player) {
                            playerIds.push({
                                player_id: player.id,
                                position_slot: slot as PositionSlot
                            })
                        }
                    }
                }

                if (playerIds.length > 0) {
                    updates.players = playerIds
                }
            }

            const response = await fetch('/api/playoffs/teams', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: teamId,
                    ...updates
                })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to update team')
            }

            // Clear pending edits and refresh
            setPendingEdits(prev => {
                const newEdits = { ...prev }
                delete newEdits[teamId]
                return newEdits
            })
            setEditingTeam(null)
            await fetchTeams()
        } catch (error: any) {
            console.error('Error updating team:', error)
            alert(`Failed to update team: ${error.message}`)
        } finally {
            setSaving(prev => ({ ...prev, [teamId]: false }))
        }
    }

    const handleDeleteTeam = async (teamId: string) => {
        if (!confirm('Are you sure you want to delete this team?')) {
            return
        }

        setSaving(prev => ({ ...prev, [teamId]: true }))
        try {
            const response = await fetch(`/api/playoffs/teams?id=${teamId}`, {
                method: 'DELETE'
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to delete team')
            }

            await fetchTeams()
        } catch (error: any) {
            console.error('Error deleting team:', error)
            alert(`Failed to delete team: ${error.message}`)
        } finally {
            setSaving(prev => ({ ...prev, [teamId]: false }))
        }
    }

    const handleAddTeam = async () => {
        if (!newTeam.team_name) {
            alert('Please enter a team name')
            return
        }

        // Check if all 17 slots are filled
        const filledSlots = Object.values(newTeam.players).filter(p => p !== null)
        if (filledSlots.length !== 17) {
            alert('Please fill all 17 player slots')
            return
        }

        setSaving(prev => ({ ...prev, adding: true }))
        try {
            // Convert player names to player IDs
            const playerIds: { player_id: string; position_slot: PositionSlot }[] = []

            for (const [slot, playerName] of Object.entries(newTeam.players)) {
                if (playerName) {
                    const player = players.find(p => p.name.toLowerCase() === playerName.toLowerCase())
                    if (!player) {
                        throw new Error(`Player "${playerName}" not found`)
                    }
                    playerIds.push({
                        player_id: player.id,
                        position_slot: slot as PositionSlot
                    })
                }
            }

            const response = await fetch('/api/playoffs/teams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    team_name: newTeam.team_name,
                    players: playerIds
                })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to add team')
            }

            // Reset form and refresh
            setNewTeam({ team_name: '', players: {} as Record<PositionSlot, string | null> })
            setShowAddForm(false)
            await fetchTeams()
        } catch (error: any) {
            console.error('Error adding team:', error)
            alert(`Failed to add team: ${error.message}`)
        } finally {
            setSaving(prev => {
                const newSaving = { ...prev }
                delete newSaving.adding
                return newSaving
            })
        }
    }

    const handleTeamFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setImportingTeams(true)
        setTeamImportMessage(null)

        try {
            const text = await file.text()

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
            }

            setShowTeamImport(false)
            e.target.value = ''
            await fetchTeams()
        } catch (error: any) {
            setTeamImportMessage({
                type: 'error',
                text: error.message || 'Failed to import teams. Please check your CSV format.'
            })
        } finally {
            setImportingTeams(false)
        }
    }

    const getPlayerForSlot = (team: FantasyTeamWithPlayers, slot: PositionSlot): PlayoffPlayer | null => {
        const teamPlayer = team.players.find(tp => tp.position_slot === slot)
        return teamPlayer?.player || null
    }

    const getEditingValue = (teamId: string, slot: PositionSlot): string | null => {
        const edits = pendingEdits[teamId]
        if (edits?.players && edits.players[slot] !== undefined) {
            return edits.players[slot]
        }
        const team = teams.find(t => t.id === teamId)
        if (team) {
            const player = getPlayerForSlot(team, slot)
            return player?.name || null
        }
        return null
    }

    const getEditingTeamName = (teamId: string): string => {
        const edits = pendingEdits[teamId]
        if (edits?.team_name !== undefined) {
            return edits.team_name
        }
        const team = teams.find(t => t.id === teamId)
        return team?.team_name || ''
    }

    const hasPendingEdits = (teamId: string): boolean => {
        const edits = pendingEdits[teamId]
        return edits ? Object.keys(edits).length > 0 : false
    }

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
                <p className="text-gray-900">Loading teams...</p>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
            <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    Admin - Manage Teams
                </h1>
                <p className="text-sm text-gray-700">
                    Add and edit fantasy teams. Click Edit on a team to modify players or team name.
                </p>
            </div>

            {/* Search and Add Button */}
            <div className="mb-4 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-700" />
                    <Input
                        type="text"
                        placeholder="Search teams..."
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
                    Add Team
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

                        {importingTeams && (
                            <div className="text-center py-4">
                                <p className="text-gray-900">Importing teams...</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Add Team Form */}
            {showAddForm && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="text-gray-900">Add New Team</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4">
                            <Label className="text-gray-900">Team Name *</Label>
                            <Input
                                value={newTeam.team_name}
                                onChange={(e) => setNewTeam({ ...newTeam, team_name: e.target.value })}
                                placeholder="Team name"
                                className="bg-white text-gray-900 placeholder:text-gray-500"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {POSITION_SLOTS.map(slot => (
                                <div key={slot}>
                                    <Label className="text-xs text-gray-900">{slot}</Label>
                                    <Input
                                        type="text"
                                        list={`players-list-${slot}`}
                                        value={newTeam.players[slot] || ''}
                                        onChange={(e) => setNewTeam({
                                            ...newTeam,
                                            players: { ...newTeam.players, [slot]: e.target.value || null }
                                        })}
                                        placeholder="Player name"
                                        className="text-sm bg-white text-gray-900 placeholder:text-gray-500"
                                    />
                                    <datalist id={`players-list-${slot}`}>
                                        {players.map(player => (
                                            <option key={player.id} value={player.name} />
                                        ))}
                                    </datalist>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <Button onClick={() => {
                                setShowAddForm(false)
                                setNewTeam({ team_name: '', players: {} as Record<PositionSlot, string | null> })
                            }} variant="outline">
                                Cancel
                            </Button>
                            <Button onClick={handleAddTeam} disabled={saving.adding} className="text-gray-900">
                                {saving.adding ? 'Adding...' : 'Add Team'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Teams List */}
            <div className="space-y-4">
                {filteredTeams.map(team => (
                    <Card key={team.id}>
                        <CardContent className="pt-6">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    {editingTeam === team.id ? (
                                        <Input
                                            value={getEditingTeamName(team.id)}
                                            onChange={(e) => handleLocalEdit(team.id, 'team_name', e.target.value)}
                                            className="text-lg font-semibold bg-white text-gray-900"
                                            placeholder="Team name"
                                        />
                                    ) : (
                                        <div className="font-semibold text-lg text-gray-900">{team.team_name}</div>
                                    )}
                                    <div className="text-lg font-bold text-blue-600 mt-2">
                                        {formatPoints(team.total_points)} PTS
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {editingTeam === team.id ? (
                                        <>
                                            <Button
                                                onClick={() => handleSaveTeam(team.id)}
                                                disabled={saving[team.id] || !hasPendingEdits(team.id)}
                                                size="sm"
                                                className="flex items-center gap-2"
                                            >
                                                <Save className="h-4 w-4" />
                                                {saving[team.id] ? 'Saving...' : 'Save Changes'}
                                            </Button>
                                            <Button
                                                onClick={() => {
                                                    setEditingTeam(null)
                                                    setPendingEdits(prev => {
                                                        const newEdits = { ...prev }
                                                        delete newEdits[team.id]
                                                        return newEdits
                                                    })
                                                }}
                                                variant="outline"
                                                size="sm"
                                                className="flex items-center gap-2"
                                            >
                                                <X className="h-4 w-4" />
                                                Cancel
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button
                                                onClick={() => setEditingTeam(team.id)}
                                                variant="outline"
                                                size="sm"
                                                className="flex items-center gap-2"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                                Edit
                                            </Button>
                                            <Button
                                                onClick={() => handleDeleteTeam(team.id)}
                                                variant="outline"
                                                size="sm"
                                                className="flex items-center gap-2 text-red-600 hover:text-red-700"
                                                disabled={saving[team.id]}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Delete
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Players Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {POSITION_SLOTS.map(slot => {
                                    const player = editingTeam === team.id
                                        ? null // Don't show current player in edit mode
                                        : getPlayerForSlot(team, slot)
                                    const editingValue = editingTeam === team.id ? getEditingValue(team.id, slot) : null

                                    return (
                                        <div key={slot}>
                                            <Label className="text-xs text-gray-900">{slot}</Label>
                                            {editingTeam === team.id ? (
                                                <>
                                                    <Input
                                                        type="text"
                                                        list={`edit-players-list-${team.id}-${slot}`}
                                                        value={editingValue || ''}
                                                        onChange={(e) => {
                                                            const currentPlayers = pendingEdits[team.id]?.players || {}
                                                            handleLocalEdit(team.id, 'players', {
                                                                ...currentPlayers,
                                                                [slot]: e.target.value || null
                                                            })
                                                        }}
                                                        placeholder="Player name"
                                                        className="text-sm bg-white text-gray-900 placeholder:text-gray-500"
                                                    />
                                                    <datalist id={`edit-players-list-${team.id}-${slot}`}>
                                                        {players.map(p => (
                                                            <option key={p.id} value={p.name} />
                                                        ))}
                                                    </datalist>
                                                </>
                                            ) : (
                                                <div className="text-sm text-gray-900 py-1.5">
                                                    {player ? (
                                                        <div>
                                                            <div className="font-medium">{player.name}</div>
                                                            <div className="text-xs text-gray-600">{player.position} - {player.nfl_team} • {formatPoints(player.tot_pts)} pts</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-500">—</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredTeams.length === 0 && (
                <div className="text-center py-8 text-gray-900">
                    No teams found. {searchQuery && 'Try adjusting your search.'}
                </div>
            )}
        </div>
    )
}
