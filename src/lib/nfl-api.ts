import { NFLPlayer, RunningBack } from '@/types'

const SPORTRADAR_API_BASE = 'https://api.sportradar.com/nfl/official/trial/v7/en'

export class NFLApiService {
  /**
   * Get current week and season information
   */
  static getCurrentWeekAndSeason() {
    // For now, return Week 1 of 2025 season
    // In a real implementation, this would dynamically determine the current week
    return { week: 1, season: 2025 }
  }

  /**
   * Fetch current week's running back statistics
   * Used by: /api/nfl/running-backs
   */
  static async getCurrentWeekRunningBacks(week: number, season: number): Promise<RunningBack[]> {
    // For 2025 season, use real NFL API data
    if (season === 2025) {
      return this.getReal2025RunningBacks(week)
    }
    
    // For other seasons, return empty data
    return this.getEmptyRunningBacks()
  }

  /**
   * Get RB1s from depth charts for the main running backs list
   * Used by: /api/running-backs/search (when no search query)
   */
  static async fetchRunningBacksFromDepthCharts(week: number, userTimezone?: string): Promise<RunningBack[]> {
    const apiKey = process.env.SPORTRADAR_API_KEY
    if (!apiKey) {
      throw new Error('SportRadar API key not configured')
    }

    try {
      // Step 1: Get current week schedule
      const scheduleResponse = await fetch(
        `${SPORTRADAR_API_BASE}/games/current_week/schedule.json?api_key=${apiKey}`,
        { next: { revalidate: 3600 } }
      )

      if (!scheduleResponse.ok) {
        throw new Error(`SportRadar schedule API returned ${scheduleResponse.status}`)
      }

      const scheduleData = await scheduleResponse.json()
      const games = scheduleData.week?.games || []

      // Step 2: Create game info map
      const teamGameInfo = new Map<string, any>()
      games.forEach((game: any) => {
        const gameStartTime = new Date(game.scheduled)
        const now = new Date()
        const isGameStarted = gameStartTime <= now

        if (game.home?.id) {
          teamGameInfo.set(game.home.id, {
            gameId: game.id,
            scheduled: game.scheduled,
            status: game.status,
            isLocked: isGameStarted,
            teamAlias: game.home.alias,
            opponent: game.away?.alias || 'TBD'
          })
        }

        if (game.away?.id) {
          teamGameInfo.set(game.away.id, {
            gameId: game.id,
            scheduled: game.scheduled,
            status: game.status,
            isLocked: isGameStarted,
            teamAlias: game.away.alias,
            opponent: game.home?.alias || 'TBD'
          })
        }
      })

      // Step 3: Get Weekly Depth Charts
      const depthChartsResponse = await fetch(
        `${SPORTRADAR_API_BASE}/seasons/2025/REG/${week}/depth_charts.json?api_key=${apiKey}`,
        { next: { revalidate: 3600 } }
      )

      if (!depthChartsResponse.ok) {
        throw new Error(`SportRadar depth charts API returned ${depthChartsResponse.status}`)
      }

      const depthChartsData = await depthChartsResponse.json()
      const teams = depthChartsData.teams || []

      // Step 4: Get completed game stats for locked players
      const completedGameStats = new Map<string, any>()
      const completedGames = games.filter((game: any) => game.status === 'closed')

      for (const game of completedGames) {
        try {
          const gameStatsResponse = await fetch(
            `${SPORTRADAR_API_BASE}/games/${game.id}/statistics.json?api_key=${apiKey}`,
            { next: { revalidate: 1800 } }
          )

          if (gameStatsResponse.ok) {
            const gameStats = await gameStatsResponse.json()
            completedGameStats.set(game.id, gameStats)
          }
        } catch (error) {
          console.error(`Error fetching stats for game ${game.id}:`, error)
        }
      }

      // Step 5: Extract RB1 from each team's depth chart
      const allRunningBacks: RunningBack[] = []

      for (const team of teams) {
        const gameInfo = teamGameInfo.get(team.id)
        if (!gameInfo) continue

        // Find the RB position in the offense
        const offense = team.offense || []
        const runningBacks: any[] = []

        for (const positionGroup of offense) {
          if (positionGroup.position?.name === 'RB' && positionGroup.position?.players) {
            runningBacks.push(...positionGroup.position.players)
          }
        }

        // Sort by depth and take top 1 (RB1)
        const top1RB = runningBacks
          .sort((a: any, b: any) => a.depth - b.depth)
          .slice(0, 1)

        top1RB.forEach((player: any) => {
          let yards = 0
          let games_played = 0
          let gameTime = this.formatGameTime(gameInfo.scheduled, userTimezone)
          
          // If game is locked (completed), try to get actual stats
          if (gameInfo.isLocked && gameInfo.status === 'closed') {
            const gameStats = completedGameStats.get(gameInfo.gameId)
            if (gameStats) {
              // Look for this player in the game stats
              const homeRushing = gameStats.home?.rushing?.players || []
              const awayRushing = gameStats.away?.rushing?.players || []
              
              // Check if player is on home team
              const homePlayer = homeRushing.find((p: any) => p.id === player.id)
              if (homePlayer) {
                yards = homePlayer.yards || 0
                games_played = 1
                gameTime = `${yards} yards` // Show rushing yards instead of "Final"
              } else {
                // Check if player is on away team
                const awayPlayer = awayRushing.find((p: any) => p.id === player.id)
                if (awayPlayer) {
                  yards = awayPlayer.yards || 0
                  games_played = 1
                  gameTime = `${yards} yards` // Show rushing yards instead of "Final"
                }
              }
            }
          }
          
          allRunningBacks.push({
            id: `${player.id}-2025-${week}`,
            player_id: player.id,
            name: player.name,
            team: team.alias,
          position: 'RB',
            season: 2025,
          week,
            yards,
            games_played,
          updated_at: new Date().toISOString(),
            is_locked: gameInfo.isLocked,
            game_start_time: gameInfo.status === 'closed' ? 'Final' : gameInfo.scheduled,
            opponent: gameInfo.opponent,
            gameTime
          })
        })
      }

      return allRunningBacks
      
    } catch (error) {
      console.error('Error fetching running backs from depth charts:', error)
      throw error
    }
  }

  /**
   * Get all running backs for search functionality
   * Used by: /api/running-backs/search (when search query is provided)
   */
  static async getAllRunningBacksForSearch(week: number, season: number, userTimezone?: string): Promise<RunningBack[]> {
    return this.fetchComprehensiveRunningBacks(week, userTimezone)
  }

  /**
   * Fetch comprehensive running backs data (all RBs from all teams)
   * Used by: getAllRunningBacksForSearch
   */
  private static async fetchComprehensiveRunningBacks(week: number, userTimezone?: string): Promise<RunningBack[]> {
    const apiKey = process.env.SPORTRADAR_API_KEY
    if (!apiKey) {
      throw new Error('SportRadar API key not configured')
    }

    try {
      // Step 1: Get current week schedule
      const scheduleResponse = await fetch(
        `${SPORTRADAR_API_BASE}/games/current_week/schedule.json?api_key=${apiKey}`,
        { next: { revalidate: 3600 } }
      )

      if (!scheduleResponse.ok) {
        throw new Error(`SportRadar schedule API returned ${scheduleResponse.status}`)
      }

      const scheduleData = await scheduleResponse.json()
      const games = scheduleData.week?.games || []

      // Step 2: Get completed game stats for locked players
      const completedGameStats = new Map<string, any>()
      const completedGames = games.filter((game: any) => game.status === 'closed')

      for (const game of completedGames) {
        try {
          const gameStatsResponse = await fetch(
            `${SPORTRADAR_API_BASE}/games/${game.id}/statistics.json?api_key=${apiKey}`,
            { next: { revalidate: 1800 } }
          )

          if (gameStatsResponse.ok) {
            const gameStats = await gameStatsResponse.json()
            completedGameStats.set(game.id, gameStats)
          }
        } catch (error) {
          console.error(`Error fetching stats for game ${game.id}:`, error)
        }
      }

      // Step 3: Get all teams from the current week schedule
      const teamsInWeek = new Set<string>()
      games.forEach((game: any) => {
        if (game.home?.id) teamsInWeek.add(game.home.id)
        if (game.away?.id) teamsInWeek.add(game.away.id)
      })

      // Step 4: Get roster for each team playing this week
      const allRunningBacks: RunningBack[] = []

      for (const game of games) {
        const homeTeam = game.home
        const awayTeam = game.away

        if (!homeTeam || !awayTeam) continue

        const gameStartTime = new Date(game.scheduled)
        const now = new Date()
        const isGameStarted = gameStartTime <= now

        // Process home team
        await this.processTeamRoster(
          homeTeam.id,
          homeTeam.alias,
          awayTeam.alias,
          game.id,
          game.scheduled,
          game.status,
          isGameStarted,
          completedGameStats,
          allRunningBacks,
          week,
          userTimezone
        )

        // Process away team
        await this.processTeamRoster(
          awayTeam.id,
          awayTeam.alias,
          homeTeam.alias,
          game.id,
          game.scheduled,
          game.status,
          isGameStarted,
          completedGameStats,
          allRunningBacks,
          week,
          userTimezone
        )
      }

      // Sort by locked status, then by yards, then alphabetically
      return allRunningBacks.sort((a, b) => {
        if (a.is_locked !== b.is_locked) {
          return a.is_locked ? -1 : 1 // Locked players first
        }
        if (a.yards !== b.yards) {
          return b.yards - a.yards // Higher yards first
        }
        return a.name.localeCompare(b.name) // Alphabetical
      })
      
    } catch (error) {
      console.error('Error fetching comprehensive running backs:', error)
      throw error
    }
  }

  /**
   * Process a team's roster to extract running backs
   */
  private static async processTeamRoster(
    teamId: string,
    teamAlias: string,
    opponentAlias: string,
    gameId: string,
    gameScheduled: string,
    gameStatus: string,
    isGameStarted: boolean,
    completedGameStats: Map<string, any>,
    allRunningBacks: RunningBack[],
    week: number,
    userTimezone?: string
  ) {
    const apiKey = process.env.SPORTRADAR_API_KEY
    if (!apiKey) return

    try {
      const rosterResponse = await fetch(
        `${SPORTRADAR_API_BASE}/teams/${teamId}/full_roster.json?api_key=${apiKey}`,
        { next: { revalidate: 3600 } }
      )

      if (!rosterResponse.ok) {
        console.error(`Failed to fetch roster for team ${teamId}: ${rosterResponse.status}`)
        return
      }

      const rosterData = await rosterResponse.json()
      const runningBacks = rosterData.players?.filter((player: any) => 
        player.position === 'RB' && player.status === 'ACT'
      ) || []

      for (const player of runningBacks) {
        let yards = 0
        let games_played = 0
        let gameTime = this.formatGameTime(gameScheduled, userTimezone)

        // If game is locked (completed), try to get actual stats
        if (isGameStarted && gameStatus === 'closed') {
          const gameStats = completedGameStats.get(gameId)
          if (gameStats) {
            // Look for this player in the game stats
            const homeRushing = gameStats.home?.rushing?.players || []
            const awayRushing = gameStats.away?.rushing?.players || []
            
            // Check if player is on home team (teamAlias matches home team alias)
            if (gameStats.home?.alias === teamAlias) {
              const homePlayer = homeRushing.find((p: any) => p.id === player.id)
              if (homePlayer) {
                yards = homePlayer.yards || 0
                games_played = 1
                gameTime = `${yards} yards` // Show rushing yards instead of "Final"
              }
            } else if (gameStats.away?.alias === teamAlias) {
              // Check if player is on away team (teamAlias matches away team alias)
              const awayPlayer = awayRushing.find((p: any) => p.id === player.id)
              if (awayPlayer) {
                yards = awayPlayer.yards || 0
                games_played = 1
                gameTime = `${yards} yards` // Show rushing yards instead of "Final"
              }
            }
          }
        }

        allRunningBacks.push({
          id: `${player.id}-2025-${week}`,
          player_id: player.id,
          name: player.name,
          team: teamAlias,
            position: 'RB',
          season: 2025,
            week,
          yards,
          games_played,
            updated_at: new Date().toISOString(),
          is_locked: isGameStarted,
          game_start_time: gameStatus === 'closed' ? 'Final' : gameScheduled,
          opponent: opponentAlias,
          gameTime
        })
      }
    } catch (error) {
      console.error(`Error fetching roster for team ${teamId}:`, error)
    }
  }

  /**
   * Get player statistics for a specific player
   * Used by: /api/automated-updates
   */
  static async getPlayerStats(playerId: string, season: number, week: number): Promise<any> {
    const apiKey = process.env.SPORTRADAR_API_KEY
    if (!apiKey) {
      throw new Error('SportRadar API key not configured')
    }

    try {
      // Get current week schedule to find the game
      const scheduleResponse = await fetch(
        `${SPORTRADAR_API_BASE}/games/current_week/schedule.json?api_key=${apiKey}`,
        { next: { revalidate: 3600 } }
      )

      if (!scheduleResponse.ok) {
        throw new Error(`SportRadar schedule API returned ${scheduleResponse.status}`)
      }

      const scheduleData = await scheduleResponse.json()
      const games = scheduleData.week?.games || []

      // Find the game for this player's team
      for (const game of games) {
        if (game.status === 'closed') {
          // Get game statistics
          const gameStatsResponse = await fetch(
            `${SPORTRADAR_API_BASE}/games/${game.id}/statistics.json?api_key=${apiKey}`,
            { next: { revalidate: 1800 } }
          )

          if (gameStatsResponse.ok) {
            const gameStats = await gameStatsResponse.json()
            
            // Look for player in home team rushing stats
            const homeRushing = gameStats.home?.rushing?.players || []
            const homePlayer = homeRushing.find((p: any) => p.id === playerId)
            if (homePlayer) {
              return {
                rushingYards: homePlayer.yards || 0,
                rushingAttempts: homePlayer.attempts || 0,
                rushingTouchdowns: homePlayer.touchdowns || 0
              }
            }

            // Look for player in away team rushing stats
            const awayRushing = gameStats.away?.rushing?.players || []
            const awayPlayer = awayRushing.find((p: any) => p.id === playerId)
            if (awayPlayer) {
        return {
                rushingYards: awayPlayer.yards || 0,
                rushingAttempts: awayPlayer.attempts || 0,
                rushingTouchdowns: awayPlayer.touchdowns || 0
              }
            }
          }
        }
      }

        return null
    } catch (error) {
      console.error('Error fetching player stats:', error)
      return null
    }
  }

  /**
   * Get 2025 season running backs (fallback method)
   */
  private static async getReal2025RunningBacks(week: number): Promise<RunningBack[]> {
    // Use the comprehensive method as fallback
    return this.fetchComprehensiveRunningBacks(week)
  }

  /**
   * Get empty running backs array for unsupported seasons
   */
  private static getEmptyRunningBacks(): RunningBack[] {
    return []
  }

  /**
   * Format game time for display
   */
  private static formatGameTime(scheduled: string, userTimezone?: string): string {
    try {
      const gameTime = new Date(scheduled)
      
      if (userTimezone) {
        return gameTime.toLocaleString('en-US', {
          timeZone: userTimezone,
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      }
      
      return gameTime.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } catch (error) {
      console.error('Error formatting game time:', error)
      return 'TBD'
    }
  }
}
