import { PositionSlot, PlayerPosition } from '@/types'

// Lock date: January 10, 2026 at noon CST (6 PM UTC)
export const TEAM_LOCK_DATE = new Date('2026-01-10T18:00:00Z')

export function areTeamsLocked(): boolean {
  return new Date() >= TEAM_LOCK_DATE
}

export const POSITION_SLOTS: PositionSlot[] = [
  'QB1', 'QB2', 'QB3',
  'RB1', 'RB2', 'RB3',
  'WR1', 'WR2', 'WR3', 'WR4',
  'TE1', 'TE2',
  'K1', 'K2',
  'FLEX1', 'FLEX2', 'FLEX3'
]

export const POSITION_SLOT_CONFIG: Record<PositionSlot, { position: PlayerPosition | 'FLEX', label: string }> = {
  QB1: { position: 'QB', label: 'QB 1' },
  QB2: { position: 'QB', label: 'QB 2' },
  QB3: { position: 'QB', label: 'QB 3' },
  RB1: { position: 'RB', label: 'RB 1' },
  RB2: { position: 'RB', label: 'RB 2' },
  RB3: { position: 'RB', label: 'RB 3' },
  WR1: { position: 'WR', label: 'WR 1' },
  WR2: { position: 'WR', label: 'WR 2' },
  WR3: { position: 'WR', label: 'WR 3' },
  WR4: { position: 'WR', label: 'WR 4' },
  TE1: { position: 'TE', label: 'TE 1' },
  TE2: { position: 'TE', label: 'TE 2' },
  K1: { position: 'K', label: 'K 1' },
  K2: { position: 'K', label: 'K 2' },
  FLEX1: { position: 'FLEX', label: 'FLEX 1' },
  FLEX2: { position: 'FLEX', label: 'FLEX 2' },
  FLEX3: { position: 'FLEX', label: 'FLEX 3' },
}

export function getPositionSlotsForPosition(position: PlayerPosition): PositionSlot[] {
  return POSITION_SLOTS.filter(slot => POSITION_SLOT_CONFIG[slot].position === position)
}

export function getFlexSlots(): PositionSlot[] {
  return ['FLEX1', 'FLEX2', 'FLEX3']
}

export function getNonFlexSlots(): PositionSlot[] {
  return POSITION_SLOTS.filter(slot => slot.startsWith('FLEX') === false)
}

export function validateTeamComposition(
  teamPlayers: { position_slot: PositionSlot; player: { name?: string; position: PlayerPosition; nfl_team: string } }[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const nonFlexPlayers = teamPlayers.filter(tp => !tp.position_slot.startsWith('FLEX'))
  const flexPlayers = teamPlayers.filter(tp => tp.position_slot.startsWith('FLEX'))

  // Check that all non-FLEX position slots have exactly 1 player from different teams
  const nflTeamsUsed = new Set<string>()
  for (const tp of nonFlexPlayers) {
    if (nflTeamsUsed.has(tp.player.nfl_team)) {
      errors.push(`Multiple players from ${tp.player.nfl_team} in non-FLEX positions`)
    }
    nflTeamsUsed.add(tp.player.nfl_team)
  }

  // Check position requirements for non-FLEX slots
  const positionCounts: Record<PlayerPosition, number> = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0 }
  for (const tp of nonFlexPlayers) {
    const slotConfig = POSITION_SLOT_CONFIG[tp.position_slot]
    if (slotConfig.position !== tp.player.position) {
      const playerName = tp.player.name || 'Player'
      errors.push(`${tp.position_slot} must be a ${slotConfig.position}, but ${playerName} is a ${tp.player.position}`)
    }
    positionCounts[tp.player.position] = (positionCounts[tp.player.position] || 0) + 1
  }

  // Validate position counts
  if (positionCounts.QB !== 3) errors.push(`Must have exactly 3 QBs, found ${positionCounts.QB}`)
  if (positionCounts.RB !== 3) errors.push(`Must have exactly 3 RBs, found ${positionCounts.RB}`)
  if (positionCounts.WR !== 4) errors.push(`Must have exactly 4 WRs, found ${positionCounts.WR}`)
  if (positionCounts.TE !== 2) errors.push(`Must have exactly 2 TEs, found ${positionCounts.TE}`)
  if (positionCounts.K !== 2) errors.push(`Must have exactly 2 Ks, found ${positionCounts.K}`)

  // Check FLEX positions (must be RB, WR, or TE)
  for (const tp of flexPlayers) {
    if (!['RB', 'WR', 'TE'].includes(tp.player.position)) {
      const playerName = tp.player.name || 'Player'
      errors.push(`FLEX positions must be RB, WR, or TE, but ${playerName} is a ${tp.player.position}`)
    }
  }

  if (flexPlayers.length !== 3) {
    errors.push(`Must have exactly 3 FLEX players, found ${flexPlayers.length}`)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

