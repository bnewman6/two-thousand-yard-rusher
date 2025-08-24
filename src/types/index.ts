export interface User {
  id: string
  email: string
  team_name: string
  team_logo_data?: string
  total_yards: number
  created_at: string
  updated_at: string
}

export interface WeeklyPick {
  id: string
  user_id: string
  week: number
  season: number
  player_name: string
  player_id: string
  yards_gained?: number
  is_finalized: boolean
  game_status: 'pending' | 'locked' | 'final'
  created_at: string
  updated_at: string
}

export interface RunningBack {
  id: string
  player_id: string
  name: string
  team: string
  position: string
  season: number
  week: number
  yards: number
  games_played: number
  updated_at: string
  opponent?: string
  gameTime?: string
  avgYards?: number
  lastWeekYards?: number
  is_locked?: boolean
  game_start_time?: string
}

export interface NFLPlayer {
  id: string
  displayName: string
  shortName: string
  jersey: string
  position: {
    abbreviation: string
    displayName: string
  }
  team: {
    id: string
    abbreviation: string
    displayName: string
    color: string
    alternateColor: string
  }
  statistics?: {
    rushingYards?: number
    rushingAttempts?: number
    rushingTouchdowns?: number
    longRushing?: number
  }
}

export interface LeaderboardEntry {
  user: User
  totalYards: number
  weeklyPicks: WeeklyPick[]
  rank: number
}

export interface Game {
  id: string
  game_id: string
  season: number
  week: number
  home_team: string
  away_team: string
  game_time: string
  status: 'scheduled' | 'live' | 'final' | 'postponed' | 'cancelled'
  quarter: number
  time_remaining: string
  home_score: number
  away_score: number
  created_at: string
  updated_at: string
}

export interface WeeklyStats {
  week: number
  topRushers: RunningBack[]
  userPicks: { [userId: string]: WeeklyPick }
}
