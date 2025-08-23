import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          team_name: string
          team_logo_data: string | null
          total_yards: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          team_name: string
          team_logo_data?: string | null
          total_yards?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          team_name?: string
          team_logo_data?: string | null
          total_yards?: number
          created_at?: string
          updated_at?: string
        }
      }
      weekly_picks: {
        Row: {
          id: string
          user_id: string
          week: number
          season: number
          player_name: string
          player_id: string
          yards_gained: number | null
          is_finalized: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          week: number
          season: number
          player_name: string
          player_id: string
          yards_gained?: number | null
          is_finalized?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          week?: number
          season?: number
          player_name?: string
          player_id?: string
          yards_gained?: number | null
          is_finalized?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      running_backs: {
        Row: {
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
        }
        Insert: {
          id?: string
          player_id: string
          name: string
          team: string
          position: string
          season: number
          week: number
          yards: number
          games_played?: number
          updated_at?: string
        }
        Update: {
          id?: string
          player_id?: string
          name?: string
          team?: string
          position?: string
          season?: number
          week?: number
          yards?: number
          games_played?: number
          updated_at?: string
        }
      }
    }
  }
}
