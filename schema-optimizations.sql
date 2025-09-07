-- Schema Optimizations for Fantasy Football Rush
-- Run these optimizations in your Supabase SQL Editor

-- ==============================================
-- PERFORMANCE INDEXES
-- ==============================================

-- Index for selected players query (most important for our optimization)
CREATE INDEX IF NOT EXISTS idx_weekly_picks_selected_players 
ON weekly_picks (season, week, is_finalized) 
WHERE is_finalized = false;

-- Index for player lookups in running_backs
CREATE INDEX IF NOT EXISTS idx_running_backs_player_lookup 
ON running_backs (player_id, season, week);

-- Index for team-based queries
CREATE INDEX IF NOT EXISTS idx_running_backs_team_season_week 
ON running_backs (team, season, week);

-- Index for locked players queries
CREATE INDEX IF NOT EXISTS idx_running_backs_locked_status 
ON running_backs (is_locked, season, week);

-- Index for game status queries
CREATE INDEX IF NOT EXISTS idx_games_season_week_status 
ON games (season, week, status);

-- Index for user picks by season/week
CREATE INDEX IF NOT EXISTS idx_weekly_picks_user_season_week 
ON weekly_picks (user_id, season, week);

-- ==============================================
-- NEW TABLES FOR OPTIMIZATION
-- ==============================================

-- Table for caching API responses to reduce SportRadar calls
CREATE TABLE IF NOT EXISTS api_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,
  response_data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS idx_api_cache_key_expires 
ON api_cache (cache_key, expires_at);

-- Table for tracking which players need updates (optimization)
CREATE TABLE IF NOT EXISTS player_update_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id TEXT NOT NULL,
  season INTEGER NOT NULL,
  week INTEGER NOT NULL,
  priority INTEGER DEFAULT 1, -- 1=normal, 2=high, 3=urgent
  last_updated TIMESTAMP WITH TIME ZONE,
  needs_update BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(player_id, season, week)
);

-- Index for update queue
CREATE INDEX IF NOT EXISTS idx_player_update_queue_priority 
ON player_update_queue (needs_update, priority, last_updated);

-- ==============================================
-- OPTIMIZED FUNCTIONS
-- ==============================================

-- Function to get selected players efficiently
CREATE OR REPLACE FUNCTION get_selected_players(target_season INTEGER, target_week INTEGER)
RETURNS TABLE (
  player_id TEXT,
  user_count BIGINT,
  total_picks BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wp.player_id,
    COUNT(DISTINCT wp.user_id) as user_count,
    COUNT(*) as total_picks
  FROM weekly_picks wp
  WHERE wp.season = target_season 
    AND wp.week = target_week 
    AND wp.is_finalized = false
  GROUP BY wp.player_id
  ORDER BY user_count DESC, total_picks DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to update player stats efficiently
CREATE OR REPLACE FUNCTION update_player_stats(
  p_player_id TEXT,
  p_season INTEGER,
  p_week INTEGER,
  p_yards INTEGER,
  p_games_played INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update running_backs table
  UPDATE running_backs 
  SET 
    yards = p_yards,
    games_played = p_games_played,
    updated_at = TIMEZONE('utc'::text, NOW())
  WHERE player_id = p_player_id 
    AND season = p_season 
    AND week = p_week;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Update weekly_picks for this player
  UPDATE weekly_picks 
  SET 
    yards_gained = p_yards,
    updated_at = TIMEZONE('utc'::text, NOW())
  WHERE player_id = p_player_id 
    AND season = p_season 
    AND week = p_week
    AND is_finalized = false;
  
  -- Update user totals
  UPDATE profiles 
  SET 
    total_yards = (
      SELECT COALESCE(SUM(yards_gained), 0)
      FROM weekly_picks 
      WHERE user_id = profiles.id 
        AND is_finalized = false
    ),
    updated_at = TIMEZONE('utc'::text, NOW())
  WHERE id IN (
    SELECT DISTINCT user_id 
    FROM weekly_picks 
    WHERE player_id = p_player_id 
      AND season = p_season 
      AND week = p_week
      AND is_finalized = false
  );
  
  RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM api_cache 
  WHERE expires_at < TIMEZONE('utc'::text, NOW());
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- RLS POLICIES FOR NEW TABLES
-- ==============================================

-- Enable RLS on new tables
ALTER TABLE api_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_update_queue ENABLE ROW LEVEL SECURITY;

-- Policies for api_cache (admin only)
CREATE POLICY "Admin can manage api cache" ON api_cache 
FOR ALL USING (auth.role() = 'service_role');

-- Policies for player_update_queue (allow inserts from triggers)
CREATE POLICY "Allow insert to update queue" ON player_update_queue 
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can manage update queue" ON player_update_queue 
FOR ALL USING (auth.role() = 'service_role');

-- ==============================================
-- TRIGGERS FOR AUTOMATION
-- ==============================================

-- Trigger to add players to update queue when picked
CREATE OR REPLACE FUNCTION add_to_update_queue()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO player_update_queue (player_id, season, week, needs_update)
  VALUES (NEW.player_id, NEW.season, NEW.week, true)
  ON CONFLICT (player_id, season, week) 
  DO UPDATE SET 
    needs_update = true,
    last_updated = TIMEZONE('utc'::text, NOW());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_add_to_update_queue
  AFTER INSERT ON weekly_picks
  FOR EACH ROW EXECUTE PROCEDURE add_to_update_queue();

-- ==============================================
-- VIEWS FOR COMMON QUERIES
-- ==============================================

-- View for active picks with player details
CREATE OR REPLACE VIEW active_picks_with_details AS
SELECT 
  wp.id as pick_id,
  wp.user_id,
  wp.season,
  wp.week,
  wp.player_name,
  wp.player_id,
  wp.yards_gained,
  wp.is_finalized,
  wp.game_status,
  rb.team,
  rb.is_locked,
  rb.game_start_time,
  p.team_name,
  p.total_yards
FROM weekly_picks wp
JOIN running_backs rb ON wp.player_id = rb.player_id 
  AND wp.season = rb.season 
  AND wp.week = rb.week
JOIN profiles p ON wp.user_id = p.id
WHERE wp.is_finalized = false;

-- View for leaderboard
CREATE OR REPLACE VIEW leaderboard AS
SELECT 
  p.id,
  p.team_name,
  p.total_yards,
  COUNT(wp.id) as total_picks,
  COUNT(CASE WHEN wp.is_finalized = true THEN 1 END) as finalized_picks,
  MAX(wp.updated_at) as last_pick_date
FROM profiles p
LEFT JOIN weekly_picks wp ON p.id = wp.user_id
GROUP BY p.id, p.team_name, p.total_yards
ORDER BY p.total_yards DESC, p.team_name ASC;

-- ==============================================
-- SCHEDULED CLEANUP (if using pg_cron extension)
-- ==============================================

-- Uncomment if you have pg_cron extension enabled
-- SELECT cron.schedule('cleanup-expired-cache', '0 */6 * * *', 'SELECT cleanup_expired_cache();');
