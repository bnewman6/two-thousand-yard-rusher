export interface User {
  id: string
  email: string
  team_name: string
  team_logo_data?: string
  total_yards: number
  is_admin?: boolean
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
  status: 'scheduled' | 'inprogress' | 'closed' | 'postponed' | 'cancelled'
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

// Playoffs Fantasy Types
export type PlayerPosition = 'QB' | 'RB' | 'WR' | 'TE' | 'K'
export type PositionSlot = 'QB1' | 'QB2' | 'QB3' | 'RB1' | 'RB2' | 'RB3' | 'WR1' | 'WR2' | 'WR3' | 'WR4' | 'TE1' | 'TE2' | 'K1' | 'K2' | 'FLEX1' | 'FLEX2' | 'FLEX3'

export interface PlayoffPlayer {
  id: string
  name: string
  position: PlayerPosition
  nfl_team: string
  eliminated: boolean
  passing_yds: number
  passing_td: number
  int: number
  rush_yds: number
  rush_td: number
  rec: number
  rec_yds: number
  rec_td: number
  fum: number
  kicking_pts: number
  tot_pts: number
  created_at: string
  updated_at: string
}

export interface FantasyTeam {
  id: string
  user_id: string
  team_name: string
  is_locked: boolean
  created_at: string
  updated_at: string
}

export interface FantasyTeamPlayer {
  id: string
  fantasy_team_id: string
  player_id: string
  position_slot: PositionSlot
  created_at: string
  player?: PlayoffPlayer
}

export interface FantasyTeamWithPlayers extends FantasyTeam {
  players: (FantasyTeamPlayer & { player: PlayoffPlayer })[]
  total_points: number
}

export interface PlayoffsLeaderboardEntry {
  fantasy_team: FantasyTeam
  total_points: number
  rank: number
}
