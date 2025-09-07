import { createClient } from '@/lib/supabase-server'
import { Game, RunningBack } from '@/types'

export class GameManager {
  private static instance: GameManager
  private supabase: any

  private constructor() {
    // Initialize Supabase client
  }

  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager()
    }
    return GameManager.instance
  }

  /**
   * Check if a player should be locked based on their game time
   */
  async checkPlayerLockStatus(playerId: string, season: number, week: number): Promise<boolean> {
    const supabase = await createClient()
    
    // Get the player's game information
    const { data: player } = await supabase
      .from('running_backs')
      .select('*')
      .eq('player_id', playerId)
      .eq('season', season)
      .eq('week', week)
      .single()

    if (!player || !player.game_start_time) {
      return false
    }

    const gameTime = new Date(player.game_start_time)
    const now = new Date()
    
    // Lock player 15 minutes before game time
    const lockTime = new Date(gameTime.getTime() - 15 * 60 * 1000)
    
    return now >= lockTime
  }

  /**
   * Update player lock status for all players in a week
   */
  async updatePlayerLocks(season: number, week: number): Promise<void> {
    const supabase = await createClient()
    
    // Get all players for this week
    const { data: players } = await supabase
      .from('running_backs')
      .select('*')
      .eq('season', season)
      .eq('week', week)

    if (!players) return

    const now = new Date()
    
    for (const player of players) {
      if (!player.game_start_time) continue
      
      const gameTime = new Date(player.game_start_time)
      const lockTime = new Date(gameTime.getTime() - 15 * 60 * 1000)
      const shouldBeLocked = now >= lockTime
      
      // Update lock status if it has changed
      if (player.is_locked !== shouldBeLocked) {
        await supabase
          .from('running_backs')
          .update({ 
            is_locked: shouldBeLocked,
            updated_at: new Date().toISOString()
          })
          .eq('id', player.id)
      }
    }
  }

  /**
   * Get game status for a specific game
   */
  async getGameStatus(gameId: string): Promise<Game | null> {
    const supabase = await createClient()
    
    const { data: game } = await supabase
      .from('games')
      .select('*')
      .eq('game_id', gameId)
      .single()

    return game
  }

  /**
   * Update game status
   */
  async updateGameStatus(gameId: string, status: Game['status'], quarter?: number, timeRemaining?: string): Promise<void> {
    const supabase = await createClient()
    
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }
    
    if (quarter !== undefined) updateData.quarter = quarter
    if (timeRemaining !== undefined) updateData.time_remaining = timeRemaining
    
    await supabase
      .from('games')
      .update(updateData)
      .eq('game_id', gameId)
  }

  /**
   * Get all games for a week
   */
  async getWeekGames(season: number, week: number): Promise<Game[]> {
    const supabase = await createClient()
    
    const { data: games } = await supabase
      .from('games')
      .select('*')
      .eq('season', season)
      .eq('week', week)
      .order('game_time', { ascending: true })

    return games || []
  }

  /**
   * Check if any games are currently live
   */
  async hasLiveGames(season: number, week: number): Promise<boolean> {
    const games = await this.getWeekGames(season, week)
    return games.some(game => game.status === 'inprogress')
  }

  /**
   * Get next game time for a week
   */
  async getNextGameTime(season: number, week: number): Promise<Date | null> {
    const games = await this.getWeekGames(season, week)
    const now = new Date()
    
    const upcomingGames = games.filter(game => 
      new Date(game.game_time) > now && game.status === 'scheduled'
    )
    
    if (upcomingGames.length === 0) return null
    
    return new Date(upcomingGames[0].game_time)
  }

  /**
   * Update pick game status based on player lock status
   */
  async updatePickGameStatus(userId: string, season: number, week: number): Promise<void> {
    const supabase = await createClient()
    
    // Get user's pick for this week
    const { data: pick } = await supabase
      .from('weekly_picks')
      .select('*')
      .eq('user_id', userId)
      .eq('season', season)
      .eq('week', week)
      .single()

    if (!pick) return

    // Check if the player is locked
    const isLocked = await this.checkPlayerLockStatus(pick.player_id, season, week)
    
    let gameStatus: 'pending' | 'locked' | 'final' = 'pending'
    if (isLocked) {
      gameStatus = 'locked'
    }
    
    // Update pick game status
    await supabase
      .from('weekly_picks')
      .update({ 
        game_status: gameStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', pick.id)
  }
}
