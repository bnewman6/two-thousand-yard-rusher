import { NFLPlayer, RunningBack } from '@/types'

const ESPN_API_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'

export class NFLApiService {
  /**
   * Fetch current week's running back statistics
   */
  static async getCurrentWeekRunningBacks(week: number, season: number): Promise<RunningBack[]> {
    try {
      // ESPN API endpoint for player statistics
      const response = await fetch(
        `${ESPN_API_BASE}/seasons/${season}/weeks/${week}/leaders?limit=50`,
        { next: { revalidate: 3600 } } // Cache for 1 hour
      )
      
      if (!response.ok) {
        throw new Error(`Failed to fetch NFL data: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Extract rushing leaders
      const rushingLeaders = data.leaders?.find((category: any) => 
        category.displayName === 'Rushing Yards' || 
        category.name === 'rushingYards'
      )
      
      if (!rushingLeaders?.leaders) {
        return []
      }
      
      return rushingLeaders.leaders
        .filter((player: any) => player.athlete?.position?.abbreviation === 'RB')
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
          updated_at: new Date().toISOString()
        }))
    } catch (error) {
      console.error('Error fetching NFL data:', error)
      return []
    }
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
    const now = new Date()
    const season = now.getMonth() < 8 ? now.getFullYear() - 1 : now.getFullYear()
    
    // Simplified week calculation
    const seasonStart = new Date(season, 8, 7) // September 7th
    const weekDiff = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
    const week = Math.min(Math.max(weekDiff, 1), 18)
    
    return { week, season }
  }
}
