import { NFLPlayer, RunningBack } from '@/types'
import { getTopRunningBacksForWeek, getPlayerWeekStats } from './nfl-data-2023'

const ESPN_API_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'

export class NFLApiService {
  /**
   * Fetch current week's running back statistics
   */
  static async getCurrentWeekRunningBacks(week: number, season: number): Promise<RunningBack[]> {
    // For 2023 season, use our real data
    if (season === 2023) {
      return this.getReal2023RunningBacks(week)
    }
    
    // For other seasons, try ESPN API (though it may not work)
    try {
      const response = await fetch(
        `${ESPN_API_BASE}/seasons/${season}/weeks/${week}/leaders?limit=50`,
        { next: { revalidate: 3600 } } // Cache for 1 hour
      )
      
      if (!response.ok) {
        console.log(`No ESPN API data for Week ${week}, Season ${season}, using fallback data`)
        return this.getFallbackRunningBacks(week, season)
      }
      
      const data = await response.json()
      
      // Extract rushing leaders
      const rushingLeaders = data.leaders?.find((category: any) => 
        category.displayName === 'Rushing Yards' || 
        category.name === 'rushingYards'
      )
      
      if (!rushingLeaders?.leaders) {
        console.log(`No rushing leaders found for Week ${week}, using fallback data`)
        return this.getFallbackRunningBacks(week, season)
      }
      
      // Convert to our format
      return rushingLeaders.leaders
        .filter((player: any) => player.athlete?.position?.abbreviation === 'RB')
        .slice(0, 10) // Top 10 running backs
        .map((player: any) => ({
          id: `${player.athlete.id}-${season}-${week}`,
          player_id: player.athlete.id,
          name: player.athlete.displayName,
          team: player.athlete.team?.abbreviation || 'UNK',
          position: 'RB',
          season,
          week,
          yards: parseFloat(player.value) || 0,
          games_played: 1,
          updated_at: new Date().toISOString(),
          // Additional metadata
          opponent: 'TBD',
          gameTime: 'Completed',
          avgYards: parseFloat(player.value) || 0,
          lastWeekYards: 0
        }))
      
    } catch (error) {
      console.error('Error fetching NFL data:', error)
      return this.getFallbackRunningBacks(week, season)
    }
  }

  /**
   * Get real 2023 season running back data
   */
  static getReal2023RunningBacks(week: number): RunningBack[] {
    const topRBs = getTopRunningBacksForWeek(week, 10)
    
    return topRBs.map((player) => ({
      id: `${player.id}-2023-${week}`,
      player_id: player.id,
      name: player.name,
      team: player.team,
      position: 'RB',
      season: 2023,
      week,
      yards: player.weekYards,
      games_played: 1,
      updated_at: new Date().toISOString(),
      // Additional metadata
      opponent: 'Completed',
      gameTime: 'Final',
      avgYards: player.avgYards,
      lastWeekYards: week > 1 ? getPlayerWeekStats(player.id, week - 1) : 0
    }))
  }

  /**
   * Get fallback running back data when real data isn't available
   */
  static getFallbackRunningBacks(week: number, season: number): RunningBack[] {
    const topRBs = [
      { 
        name: 'Christian McCaffrey', 
        team: 'SF', 
        id: '4362627',
        opponent: 'LAR',
        gameTime: 'Sunday 1:00 PM',
        avgYards: 95,
        lastWeekYards: 87
      },
      { 
        name: 'Derrick Henry', 
        team: 'BAL', 
        id: '2977189',
        opponent: 'CIN',
        gameTime: 'Sunday 1:00 PM',
        avgYards: 88,
        lastWeekYards: 102
      },
      { 
        name: 'Saquon Barkley', 
        team: 'PHI', 
        id: '4362628',
        opponent: 'ATL',
        gameTime: 'Sunday 1:00 PM',
        avgYards: 82,
        lastWeekYards: 76
      },
      { 
        name: 'Josh Jacobs', 
        team: 'GB', 
        id: '4362629',
        opponent: 'MIN',
        gameTime: 'Sunday 1:00 PM',
        avgYards: 78,
        lastWeekYards: 91
      },
      { 
        name: 'Breece Hall', 
        team: 'NYJ', 
        id: '4362630',
        opponent: 'NE',
        gameTime: 'Sunday 1:00 PM',
        avgYards: 85,
        lastWeekYards: 94
      },
      { 
        name: 'Travis Etienne', 
        team: 'JAX', 
        id: '4362631',
        opponent: 'IND',
        gameTime: 'Sunday 1:00 PM',
        avgYards: 79,
        lastWeekYards: 83
      },
      { 
        name: 'Rachaad White', 
        team: 'TB', 
        id: '4362632',
        opponent: 'CAR',
        gameTime: 'Sunday 1:00 PM',
        avgYards: 72,
        lastWeekYards: 68
      },
      { 
        name: 'Kyren Williams', 
        team: 'LAR', 
        id: '4362633',
        opponent: 'SF',
        gameTime: 'Sunday 1:00 PM',
        avgYards: 89,
        lastWeekYards: 104
      },
      { 
        name: 'James Conner', 
        team: 'ARI', 
        id: '4362634',
        opponent: 'NYG',
        gameTime: 'Sunday 1:00 PM',
        avgYards: 76,
        lastWeekYards: 71
      },
      { 
        name: 'Joe Mixon', 
        team: 'HOU', 
        id: '4362635',
        opponent: 'JAX',
        gameTime: 'Sunday 1:00 PM',
        avgYards: 81,
        lastWeekYards: 89
      },
    ]

          // Use consistent yardage for fallback data
      return topRBs.map((rb, index) => {
        // Simple consistent yardage based on player ID and week
        const seed = parseInt(rb.id) + week + season
        const yards = 50 + (seed % 100) // 50-150 yards range
        
        return {
          id: `${rb.id}-${season}-${week}`,
          player_id: rb.id,
          name: rb.name,
          team: rb.team,
          position: 'RB',
          season,
          week,
          yards,
          games_played: 1,
          updated_at: new Date().toISOString(),
          // Additional metadata for display
          opponent: rb.opponent,
          gameTime: rb.gameTime,
          avgYards: rb.avgYards,
          lastWeekYards: rb.lastWeekYards
        }
      })
  }
  
  /**
   * Fetch all active running backs for the current season
   */
  static async getAllRunningBacks(season: number): Promise<NFLPlayer[]> {
    try {
      const response = await fetch(
        `${ESPN_API_BASE}/seasons/${season}/athletes?position=RB&limit=100`,
        { next: { revalidate: 86400 } } // Cache for 24 hours
      )
      
      if (!response.ok) {
        throw new Error(`Failed to fetch NFL players: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      return data.athletes?.map((player: any) => ({
        id: player.id,
        displayName: player.displayName,
        shortName: player.shortName || player.displayName,
        jersey: player.jersey || '',
        position: {
          abbreviation: player.position?.abbreviation || 'RB',
          displayName: player.position?.displayName || 'Running Back'
        },
        team: {
          id: player.team?.id || '',
          abbreviation: player.team?.abbreviation || '',
          displayName: player.team?.displayName || '',
          color: player.team?.color || '000000',
          alternateColor: player.team?.alternateColor || 'FFFFFF'
        }
      })) || []
    } catch (error) {
      console.error('Error fetching NFL players:', error)
      return []
    }
  }
  
  /**
   * Fetch specific player statistics for a week
   */
  static async getPlayerWeekStats(playerId: string, week: number, season: number): Promise<number> {
    try {
      const response = await fetch(
        `${ESPN_API_BASE}/seasons/${season}/weeks/${week}/athletes/${playerId}/statistics`,
        { next: { revalidate: 3600 } } // Cache for 1 hour
      )
      
      if (!response.ok) {
        return 0
      }
      
      const data = await response.json()
      
      // Look for rushing yards in the statistics
      const rushingYards = data.statistics?.find((stat: any) => 
        stat.name === 'rushingYards' || stat.displayName === 'Rushing Yards'
      )
      
      return parseFloat(rushingYards?.value) || 0
    } catch (error) {
      console.error(`Error fetching player ${playerId} stats:`, error)
      return 0
    }
  }
  
  /**
   * Get current NFL week and season
   */
  static getCurrentWeekAndSeason(): { week: number; season: number } {
    // Check localStorage first for testing, then fall back to defaults
    if (typeof window !== 'undefined') {
      const storedWeek = localStorage.getItem('currentWeek')
      const storedSeason = localStorage.getItem('currentSeason')
      if (storedWeek && storedSeason) {
        return { week: parseInt(storedWeek), season: parseInt(storedSeason) }
      }
    }
    
    // Default: 2023 season, Week 1
    const season = 2023
    const week = 1
    
    return { week, season }
  }

  /**
   * Set the current week and season for testing
   */
  static setCurrentWeekAndSeason(week: number, season: number) {
    // This would typically update a global state or database
    // For now, we'll use localStorage for testing
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentWeek', week.toString())
      localStorage.setItem('currentSeason', season.toString())
    }
  }

  /**
   * Get the current week and season (with localStorage fallback for testing)
   */
  static getCurrentWeekAndSeasonWithFallback(): { week: number; season: number } {
    if (typeof window !== 'undefined') {
      const storedWeek = localStorage.getItem('currentWeek')
      const storedSeason = localStorage.getItem('currentSeason')
      if (storedWeek && storedSeason) {
        return { week: parseInt(storedWeek), season: parseInt(storedSeason) }
      }
    }
    return this.getCurrentWeekAndSeason()
  }
}
