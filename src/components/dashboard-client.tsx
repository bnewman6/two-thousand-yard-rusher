'use client'

import { useState, useEffect } from 'react'
import { WeeklyPickSelector } from '@/components/weekly-pick-selector'
import { Leaderboard } from '@/components/leaderboard'
import { WeekSimulator } from '@/components/week-simulator'
import { AutomatedUpdatesPanel } from '@/components/automated-updates-panel'
import { WeekYardsLeaders } from '@/components/week-yards-leaders'
import { LiveGamesRushing } from '@/components/live-games-rushing'
import { NFLApiService } from '@/lib/nfl-api'

interface DashboardClientProps {
  profile: any
}

export function DashboardClient({ profile }: DashboardClientProps) {
  // Initialize state with values from localStorage synchronously (but safely)
  const getInitialState = () => {
    if (typeof window !== 'undefined') {
      try {
        const storedWeek = localStorage.getItem('currentWeek')
        const storedSeason = localStorage.getItem('currentSeason')
        
        console.log('DashboardClient: getInitialState called with localStorage:', { storedWeek, storedSeason })
        
        if (storedWeek && storedSeason) {
          const storedSeasonNum = parseInt(storedSeason)
          const storedWeekNum = parseInt(storedWeek)
          
                  if (!isNaN(storedSeasonNum) && !isNaN(storedWeekNum) && 
            storedSeasonNum === 2025 && storedWeekNum >= 1 && storedWeekNum <= 18) {
            console.log('DashboardClient: Returning stored values:', { week: storedWeekNum, season: storedSeasonNum })
            return { week: storedWeekNum, season: storedSeasonNum }
          }
        }
      } catch (error) {
        console.error('DashboardClient: Error in getInitialState:', error)
      }
    }
    console.log('DashboardClient: Returning default values')
    return { week: 1, season: 2025 }
  }

  const initialState = getInitialState()
  const [currentWeek, setCurrentWeek] = useState(initialState.week)
  const [currentSeason, setCurrentSeason] = useState(initialState.season)

  console.log('DashboardClient: Initial state set to:', { currentWeek, currentSeason })

  console.log('DashboardClient: Current state:', { currentWeek, currentSeason })

  useEffect(() => {
    // Ensure localStorage is set with current values (for cases where it might be missing)
    const storedWeek = localStorage.getItem('currentWeek')
    const storedSeason = localStorage.getItem('currentSeason')
    
    console.log('DashboardClient: Checking localStorage consistency:', { 
      storedWeek, 
      storedSeason, 
      currentWeek, 
      currentSeason 
    })
    
    // If localStorage doesn't match current state, update it
    if (storedWeek !== currentWeek.toString() || storedSeason !== currentSeason.toString()) {
      console.log('DashboardClient: Updating localStorage to match current state')
      localStorage.setItem('currentWeek', currentWeek.toString())
      localStorage.setItem('currentSeason', currentSeason.toString())
    }
  }, [currentWeek, currentSeason])

  const handleWeekChange = (week: number, season: number) => {
    setCurrentWeek(week)
    setCurrentSeason(season)
    // Update localStorage
    localStorage.setItem('currentWeek', week.toString())
    localStorage.setItem('currentSeason', season.toString())
  }

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Welcome back, {profile?.team_name || 'Coach'}!
        </h1>
        <p className="text-gray-600 text-sm sm:text-base">
          Current total: {profile?.total_yards || 0} yards
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Weekly Pick Selector */}
        <WeeklyPickSelector 
          key={`${currentWeek}-${currentSeason}`}
          currentWeek={currentWeek}
          currentSeason={currentSeason}
        />
        
        {/* Leaderboard */}
        <Leaderboard />
      </div>
      
      {/* Week Yards Leaders */}
      <div className="mt-6 sm:mt-8">
        <WeekYardsLeaders 
          season={currentSeason}
          week={currentWeek}
        />
      </div>
      
      {/* Live Games Rushing Stats */}
      <div className="mt-6 sm:mt-8">
        <LiveGamesRushing 
          season={currentSeason}
          week={currentWeek}
        />
      </div>
      
      {/* Progress to Goal */}
      <div className="mt-6 sm:mt-8 bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Progress to 2,000 Yards</h2>
        <div className="w-full bg-gray-200 rounded-full h-4 sm:h-6">
          <div 
            className="bg-green-500 h-4 sm:h-6 rounded-full transition-all duration-300" 
            style={{ width: `${Math.min(((profile?.total_yards || 0) / 2000) * 100, 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-2">
          <p className="text-xs sm:text-sm text-gray-600">
            {profile?.total_yards || 0} yards gained
          </p>
          <p className="text-xs sm:text-sm text-gray-600">
            {2000 - (profile?.total_yards || 0)} yards to go!
          </p>
        </div>
      </div>

      {/* Automated Updates Panel */}
      <div className="mt-6 sm:mt-8">
        <AutomatedUpdatesPanel 
          season={currentSeason}
          week={currentWeek}
        />
      </div>

      {/* Week Simulator for Testing */}
      <div className="mt-6 sm:mt-8">
        <WeekSimulator 
          currentWeek={currentWeek} 
          currentSeason={currentSeason} 
          onWeekChange={handleWeekChange}
        />
      </div>
    </div>
  )
}
