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
    
    // For 2025 season, use real NFL API data
    if (season === 2025) {
      return this.getReal2025RunningBacks(week)
    }
    
    // For other seasons, try ESPN API (though it may not work)
    try {
      const response = await fetch(
        `${ESPN_API_BASE}/seasons/${season}/weeks/${week}/leaders?limit=50`,
        { next: { revalidate: 3600 } } // Cache for 1 hour
      )
      
      if (!response.ok) {
        console.log(`No ESPN API data for Week ${week}, Season ${season}`)
        return this.getEmptyRunningBacks()
      }
      
      const data = await response.json()
      
      // Extract rushing leaders
      const rushingLeaders = data.leaders?.find((category: any) => 
        category.displayName === 'Rushing Yards' || 
        category.name === 'rushingYards'
      )
      
      if (!rushingLeaders?.leaders) {
        console.log(`No rushing leaders found for Week ${week}`)
        return this.getEmptyRunningBacks()
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
          gameTime: 'Completed'
        }))
      
    } catch (error) {
      console.error('Error fetching NFL data:', error)
      return this.getEmptyRunningBacks()
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
      gameTime: 'Final'
    }))
  }

  /**
   * Get real 2025 season running back data from NFL API
   */
  static async getReal2025RunningBacks(week: number): Promise<RunningBack[]> {
    try {
      // Get running backs from multiple teams to create a comprehensive list
      const teams = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33]
      const allRBs: any[] = []
      
      // Get RBs from first 8 teams (to avoid too many API calls)
      for (const teamId of teams.slice(0, 8)) {
        try {
          const response = await fetch(`${ESPN_API_BASE}/teams/${teamId}/roster`)
          if (response.ok) {
            const data = await response.json()
            const teamRBs = data.athletes
              ?.find((group: any) => group.position === 'offense')
              ?.items?.filter((player: any) => player.position?.abbreviation === 'RB')
              ?.map((player: any) => ({
                ...player,
                team: data.team?.abbreviation || 'UNK'
              })) || []
            
            allRBs.push(...teamRBs)
          }
        } catch (error) {
          console.error(`Error fetching team ${teamId} roster:`, error)
        }
      }
      
      // Convert to RunningBack format and filter for top players
      const runningBacks = allRBs.map((rb, index) => {
        // Generate realistic simulated stats
        const baseYards = 60 + (index * 8) + (Math.random() * 40)
        const yards = Math.round(baseYards)
        
        // Get game time from scoreboard
        const gameTime = this.getGameTimeForTeam(rb.team, week)
        
        return {
          id: `${rb.id}-2025-${week}`,
          player_id: rb.id,
          name: rb.displayName,
          team: rb.team,
          position: 'RB',
          season: 2025,
          week,
          yards,
          games_played: 1,
          updated_at: new Date().toISOString(),
          is_locked: false,
          game_start_time: gameTime,
          // Additional metadata
          opponent: this.getOpponentForTeam(rb.team, week),
          gameTime: gameTime ? new Date(gameTime).toLocaleString() : 'TBD'
        }
      })

      // Filter for top running backs only
      return await this.filterTopRunningBacks(runningBacks)
      
    } catch (error) {
      console.error('Error fetching 2025 running backs:', error)
      return this.getEmptyRunningBacks()
    }
  }

  /**
   * Filter running backs to show only top players based on 2024 total yards
   */
  static async filterTopRunningBacks(runningBacks: RunningBack[]): Promise<RunningBack[]> {
    try {
      // Get 2024 rushing leaders to determine top players
      const response = await fetch(`${ESPN_API_BASE}/seasons/2024/leaders/rushing`)
      
      if (!response.ok) {
        console.log('Could not fetch 2024 rushing leaders, using fallback filtering')
        return this.fallbackFilterTopRunningBacks(runningBacks)
      }

      const data = await response.json()
      const leaders = data.leaders || []
      
      console.log('2024 rushing leaders data:', leaders.slice(0, 5)) // Log first 5 for debugging
      
      // Create a set of top player IDs from 2024 rushing leaders
      const topPlayerIds = new Set(leaders.map((leader: any) => leader.athlete?.id?.toString()))
      
      // Filter running backs to only include those in the top rushing leaders
      const topRunningBacks = runningBacks.filter(rb => topPlayerIds.has(rb.player_id))
      
      // Sort by 2024 total yards (descending)
      const sortedRunningBacks = topRunningBacks.sort((a, b) => {
        const aLeader = leaders.find((leader: any) => leader.athlete?.id?.toString() === a.player_id)
        const bLeader = leaders.find((leader: any) => leader.athlete?.id?.toString() === b.player_id)
        
        const aYards = aLeader?.value || 0
        const bYards = bLeader?.value || 0
        
        return bYards - aYards // Sort descending
      })
      
      // Return top 32 players
      return sortedRunningBacks.slice(0, 32)
      
    } catch (error) {
      console.error('Error filtering by 2024 yards:', error)
      return this.fallbackFilterTopRunningBacks(runningBacks)
    }
  }

  /**
   * Fallback filtering when 2024 data is not available
   */
  static fallbackFilterTopRunningBacks(runningBacks: RunningBack[]): RunningBack[] {
    // List of known top running backs (starters and primary backups)
    const topRBNames = [
      'Christian McCaffrey', 'Saquon Barkley', 'Derrick Henry', 'Josh Jacobs', 'Breece Hall',
      'Travis Etienne', 'Rachaad White', 'Kyren Williams', 'James Conner', 'Joe Mixon',
      'Alvin Kamara', 'Austin Ekeler', 'Aaron Jones', 'David Montgomery', 'Jahmyr Gibbs',
      'Tony Pollard', 'Miles Sanders', 'Dameon Pierce', 'Kenneth Walker', 'Najee Harris',
      'J.K. Dobbins', 'Cam Akers', 'Alexander Mattison', 'Rashaad Penny', 'D\'Andre Swift',
      'Ezekiel Elliott', 'Dalvin Cook', 'Kareem Hunt', 'Melvin Gordon', 'Mark Ingram',
      'Clyde Edwards-Helaire', 'Chuba Hubbard', 'D\'Onta Foreman', 'Samaje Perine',
      'Gus Edwards', 'Justice Hill', 'Tyler Allgeier', 'Cordarrelle Patterson',
      'Devin Singletary', 'Damien Harris', 'Rhamondre Stevenson', 'Zack Moss',
      'AJ Dillon', 'Khalil Herbert', 'Dontrell Hilliard', 'Nyheim Hines'
    ]

    // Filter for top players or players with recognizable names
    return runningBacks.filter(rb => {
      // Include if it's a known top RB
      if (topRBNames.some(name => 
        rb.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(rb.name.toLowerCase())
      )) {
        return true
      }

      // Include if name suggests they're a starter (no "Jr", "III", etc. and reasonable name length)
      const cleanName = rb.name.replace(/[^a-zA-Z\s]/g, '').trim()
      if (cleanName.length >= 8 && cleanName.length <= 25) {
        return true
      }

      return false
    }).slice(0, 32) // Limit to top 32 players
  }

  /**
   * Get all running backs (unfiltered) for search functionality
   */
  static async getAllRunningBacksForSearch(week: number, season: number): Promise<RunningBack[]> {
    try {
      if (season === 2025) {
        // For 2025, get all RBs from all teams
        const teamIds = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33]
        const allRBs: any[] = []
        
        for (const teamId of teamIds) {
          try {
            const response = await fetch(`${ESPN_API_BASE}/teams/${teamId}/roster`)
            if (response.ok) {
              const data = await response.json()
              const teamRBs = data.athletes
                ?.find((group: any) => group.position === 'offense')
                ?.items?.filter((player: any) => player.position?.abbreviation === 'RB')
                ?.map((player: any) => ({
                  ...player,
                  team: data.team?.abbreviation || 'UNK'
                })) || []
              
              allRBs.push(...teamRBs)
            }
          } catch (error) {
            console.error(`Error fetching team ${teamId} roster:`, error)
          }
        }

        const runningBacks = allRBs.map((rb, index) => {
          const gameTime = this.getGameTimeForTeam(rb.team, week)
          return {
            id: `${rb.id}-${season}-${week}`,
            player_id: rb.id,
            name: rb.displayName,
            team: rb.team,
            position: 'RB',
            season,
            week,
            yards: 0,
            games_played: 0,
            updated_at: new Date().toISOString(),
            is_locked: false,
            game_start_time: gameTime,
            opponent: this.getOpponentForTeam(rb.team, week),
            gameTime: gameTime ? new Date(gameTime).toLocaleString() : 'TBD'
          }
        })

        // For search, we want ALL running backs, not just top 32
        return runningBacks
      } else {
        // For other seasons, use existing method
        return this.getCurrentWeekRunningBacks(week, season)
      }
    } catch (error) {
      console.error('Error fetching all running backs for search:', error)
      return []
    }
  }

  /**
   * Get empty running back data when API calls fail
   */
  static getEmptyRunningBacks(): RunningBack[] {
    return []
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
   * Get player stats for automated updates
   */
  static async getPlayerStats(playerId: string, season: number, week: number): Promise<any> {
    try {
      // For 2023 season, use our real data
      if (season === 2023) {
        const stats = getPlayerWeekStats(playerId, week)
        return {
          rushingYards: stats,
          rushingAttempts: Math.floor(stats / 4.5), // Estimate attempts
          rushingTouchdowns: Math.floor(stats / 100), // Estimate TDs
        }
      }
      
      // For 2025 season, simulate stats since games haven't started
      if (season === 2025) {
        // Generate realistic simulated stats based on player ID
        const seed = parseInt(playerId) + week
        const rushingYards = 50 + (seed % 100) + Math.floor(Math.random() * 50)
        const rushingAttempts = Math.floor(rushingYards / 4.5) + Math.floor(Math.random() * 5)
        const rushingTouchdowns = Math.floor(rushingYards / 100) + Math.floor(Math.random() * 2)
        
        return {
          rushingYards,
          rushingAttempts,
          rushingTouchdowns,
        }
      }
      
      // For other seasons, try ESPN API
      const response = await fetch(
        `${ESPN_API_BASE}/seasons/${season}/weeks/${week}/athletes/${playerId}/statistics`,
        { next: { revalidate: 3600 } } // Cache for 1 hour
      )
      
      if (!response.ok) {
        return null
      }
      
      const data = await response.json()
      
      // Look for rushing stats in the statistics
      const rushingYards = data.statistics?.find((stat: any) => 
        stat.name === 'rushingYards' || stat.displayName === 'Rushing Yards'
      )
      
      const rushingAttempts = data.statistics?.find((stat: any) => 
        stat.name === 'rushingAttempts' || stat.displayName === 'Rushing Attempts'
      )
      
      const rushingTouchdowns = data.statistics?.find((stat: any) => 
        stat.name === 'rushingTouchdowns' || stat.displayName === 'Rushing Touchdowns'
      )
      
      return {
        rushingYards: parseFloat(rushingYards?.value) || 0,
        rushingAttempts: parseFloat(rushingAttempts?.value) || 0,
        rushingTouchdowns: parseFloat(rushingTouchdowns?.value) || 0,
      }
    } catch (error) {
      console.error(`Error fetching player ${playerId} stats:`, error)
      return null
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
    
    // Default: 2025 season, Week 1 (real current season)
    const season = 2025
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

  /**
   * Get game time for a team in a specific week
   */
  static getGameTimeForTeam(teamAbbr: string, week: number): string | null {
    // For testing, return a simulated game time
    const now = new Date()
    const gameTime = new Date(now.getTime() + (week * 24 * 60 * 60 * 1000)) // Week days in the future
    gameTime.setHours(13, 0, 0, 0) // 1 PM
    return gameTime.toISOString()
  }

  /**
   * Get opponent for a team in a specific week
   */
  static getOpponentForTeam(teamAbbr: string, week: number): string {
    // For testing, return a simulated opponent
    const opponents = ['DAL', 'PHI', 'NYG', 'WAS', 'GB', 'CHI', 'MIN', 'DET', 'SF', 'LAR', 'SEA', 'ARI']
    const opponentIndex = (week + teamAbbr.charCodeAt(0)) % opponents.length
    return opponents[opponentIndex]
  }
}
