/**
 * Parser for team CSV format where headers are the actual team names
 * Format:
 * - Row 1: Headers (actual team names, e.g., "My Team", "Another Team", etc.)
 * - Row 2: Points row (optional, can be skipped - might have point totals or be empty)
 * - Rows 3-19: 17 players for each team (one player per row)
 * 
 * Every other column might be a "Pts" column that we can ignore
 */
export interface ParsedTeam {
  team_name: string
  players: string[] // Array of 17 player names
}

export function parseTeamCSV(csvText: string): ParsedTeam[] {
  const lines = csvText.split('\n').filter(line => line.trim())
  
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row')
  }

  // Parse header - these are the actual team names
  const headerLine = lines[0]
  const headers = parseCSVLine(headerLine).map(h => h.trim())
  
  // Filter out "Pts" columns - we only want team name columns
  // Team columns are those that don't match "Pts", "PTS", "Points", etc.
  const teamColumns: { teamIndex: number; teamName: string }[] = []
  
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i]
    // Skip columns that look like "Pts X", "Points X", or just "Pts"/"PTS"
    if (!/^pts?\s*\d*$/i.test(header) && !/^points?\s*\d*$/i.test(header)) {
      // This is a team name column
      if (header) { // Only include non-empty headers
        teamColumns.push({ teamIndex: i, teamName: header })
      }
    }
  }

  if (teamColumns.length === 0) {
    throw new Error('No team name columns found in CSV header. Headers should be team names.')
  }

  // Parse data rows - skip header
  const dataRows = lines.slice(1)
  
  // Check if row 2 looks like a points row (all numbers or mostly numbers/empty)
  // If so, skip it and start players from row 3
  let playerStartRow = 1
  if (dataRows.length > 0) {
    const firstDataRow = parseCSVLine(dataRows[0])
    // Check if this row looks like points (mostly numbers or empty)
    let numbersCount = 0
    let nonEmptyCount = 0
    
    for (let i = 0; i < teamColumns.length; i++) {
      const col = teamColumns[i]
      const value = firstDataRow[col.teamIndex]?.trim() || ''
      if (value) {
        nonEmptyCount++
        if (/^-?\d+\.?\d*$/.test(value)) { // Looks like a number
          numbersCount++
        }
      }
    }
    
    // If most values are numbers and we have at least some data, assume it's a points row
    if (nonEmptyCount > 0 && numbersCount / nonEmptyCount > 0.7) {
      playerStartRow = 2
    }
  }

  // Initialize teams with their names from headers
  const teams: ParsedTeam[] = teamColumns.map(col => ({
    team_name: col.teamName,
    players: []
  }))

  // Extract players (17 rows of player data)
  const playerRows = dataRows.slice(playerStartRow - 1, playerStartRow - 1 + 17)
  
  if (playerRows.length < 17) {
    throw new Error(`Expected 17 rows of player data, found ${playerRows.length} (starting from row ${playerStartRow + 1})`)
  }

  // For each player row, extract player names from team columns
  for (let playerRowIdx = 0; playerRowIdx < 17; playerRowIdx++) {
    const rowValues = parseCSVLine(playerRows[playerRowIdx])
    
    for (let teamIdx = 0; teamIdx < teams.length; teamIdx++) {
      const col = teamColumns[teamIdx]
      const playerName = rowValues[col.teamIndex]?.trim() || ''
      if (playerName) {
        teams[teamIdx].players.push(playerName)
      }
    }
  }

  // Validate each team has 17 players
  for (const team of teams) {
    if (team.players.length !== 17) {
      throw new Error(`Team "${team.team_name}" has ${team.players.length} players, expected 17`)
    }
  }

  return teams
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}
