'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Trophy, Target, Calendar, MapPin, Edit3, Save, X } from 'lucide-react'
import { LogoEditor } from '@/components/logo-editor'
import { LogoDisplay } from '@/components/logo-display'

interface ProfileClientProps {
  user: any
  profile: any
  picks: any[]
  leaderboardPosition: number
}

export function ProfileClient({ user, profile, picks, leaderboardPosition }: ProfileClientProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [teamName, setTeamName] = useState(profile?.team_name || '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isLogoEditorOpen, setIsLogoEditorOpen] = useState(false)

  const handleSaveProfile = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          team_name: teamName,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('✅ Profile updated successfully!')
        setIsEditing(false)
        // Refresh the page to show updated data
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        setMessage(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage('❌ Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setTeamName(profile?.team_name || '')
    setIsEditing(false)
    setMessage(null)
  }

  const handleSaveLogo = async (logoData: string) => {
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          team_name: profile?.team_name,
          logo_data: logoData,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('✅ Logo updated successfully!')
        // Refresh the page to show updated logo
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        setMessage(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error updating logo:', error)
      setMessage('❌ Failed to update logo')
    } finally {
      setLoading(false)
    }
  }

  const getPickStatus = (pick: any) => {
    if (pick.is_finalized) {
      return { status: 'Finalized', color: 'text-green-600', bg: 'bg-green-50' }
    } else {
      return { status: 'Pending', color: 'text-yellow-600', bg: 'bg-yellow-50' }
    }
  }

  const formatMatchup = (pick: any) => {
    // For now, we'll use a placeholder. In the future, this could come from game data
    return `${pick.player_name} vs Opponent`
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600">Manage your account and view your season stats</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Profile Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {message && (
                <div className={`p-3 rounded-md text-sm ${
                  message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {message}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Email</Label>
                  <div className="mt-1 text-gray-900">{user.email}</div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Team Name</Label>
                  {isEditing ? (
                    <div className="mt-1 space-y-2">
                      <Input
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="Enter your team name"
                      />
                      <div className="flex space-x-2">
                        <Button
                          onClick={handleSaveProfile}
                          disabled={loading || !teamName.trim()}
                          size="sm"
                        >
                          <Save className="h-4 w-4 mr-1" />
                          {loading ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          onClick={handleCancelEdit}
                          variant="outline"
                          size="sm"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center justify-between">
                      <div className="text-gray-900">{profile?.team_name || 'No team name set'}</div>
                      <Button
                        onClick={() => setIsEditing(true)}
                        variant="ghost"
                        size="sm"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Logo</Label>
                  <div className="mt-1">
                    <LogoDisplay 
                      logoData={profile?.team_logo_data}
                      onEdit={() => setIsLogoEditorOpen(true)}
                      size="md"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Season Stats */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="h-5 w-5" />
                <span>Season Statistics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="text-2xl font-bold text-blue-900">{profile?.total_yards || 0}</div>
                      <div className="text-sm text-blue-600">Total Yards</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="text-2xl font-bold text-green-900">
                        {leaderboardPosition > 0 ? `#${leaderboardPosition}` : 'N/A'}
                      </div>
                      <div className="text-sm text-green-600">Leaderboard Rank</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    <div>
                      <div className="text-2xl font-bold text-purple-900">{picks.length}</div>
                      <div className="text-sm text-purple-600">Picks Made</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress to Goal */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-sm font-medium text-gray-700">Progress to 2,000 Yards</Label>
                  <span className="text-sm text-gray-600">
                    {profile?.total_yards || 0} / 2,000 yards
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min(((profile?.total_yards || 0) / 2000) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {2000 - (profile?.total_yards || 0)} yards remaining
                </div>
              </div>

              {/* Pick History */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                  <MapPin className="h-5 w-5" />
                  <span>Pick History</span>
                </h3>
                
                {picks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No picks made yet</p>
                    <p className="text-sm">Start making picks to see your history here</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {picks.map((pick) => {
                      const status = getPickStatus(pick)
                      return (
                        <div key={pick.id} className="p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-medium text-gray-900">Week {pick.week}</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                                  {status.status}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 mb-1">
                                <span className="font-medium">{pick.player_name}</span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatMatchup(pick)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900">
                                {pick.yards_gained || 0}
                              </div>
                              <div className="text-xs text-gray-500">yards</div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Logo Editor Modal */}
      <LogoEditor
        isOpen={isLogoEditorOpen}
        onClose={() => setIsLogoEditorOpen(false)}
        onSave={handleSaveLogo}
        currentLogo={profile?.team_logo_data}
      />
    </div>
  )
}
