import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// POST - Bulk import players from CSV data
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const body = await request.json()
        const { players } = body

        if (!players || !Array.isArray(players)) {
            return NextResponse.json({ error: 'Players array required' }, { status: 400 })
        }

        if (players.length === 0) {
            return NextResponse.json({ error: 'No players to import' }, { status: 400 })
        }

        // Validate and prepare players data
        const playersToInsert = players.map((p: any) => {
            // Map common CSV column names to database fields
            const player = {
                name: p.name || p['Player Name'] || p['Name'] || '',
                position: (p.position || p['POS'] || '').toUpperCase().trim(),
                nfl_team: p.nfl_team || p['NFL Team'] || p['Team'] || p['NFL'] || '',
                eliminated: p.eliminated === true || p['Eliminated'] === 'TRUE' || false,
                passing_yds: parseInt(p.passing_yds || p['Passing YDS'] || p['Pass YDS'] || p['PY'] || '0') || 0,
                passing_td: parseInt(p.passing_td || p['Passing TD'] || p['Pass TD'] || p['PTD'] || '0') || 0,
                int: parseInt(p.int || p['INT'] || p['Interceptions'] || '0') || 0,
                rush_yds: parseInt(p.rush_yds || p['Rush YDS'] || p['Rushing YDS'] || p['RY'] || '0') || 0,
                rush_td: parseInt(p.rush_td || p['Rush TD'] || p['Rushing TD'] || p['RTD'] || '0') || 0,
                rec: parseInt(p.rec || p['REC'] || p['Receptions'] || '0') || 0,
                rec_yds: parseInt(p.rec_yds || p['REC YDS'] || p['Receiving YDS'] || p['ReY'] || '0') || 0,
                rec_td: parseInt(p.rec_td || p['REC TD'] || p['Receiving TD'] || p['ReTD'] || '0') || 0,
                fum: parseInt(p.fum || p['FUM'] || p['Fumbles'] || '0') || 0,
                kicking_pts: parseFloat(p.kicking_pts || p['Kicking'] || p['Kicking PTS'] || p['KP'] || '0') || 0,
            }

            // Validate required fields
            if (!player.name || !player.position || !player.nfl_team) {
                throw new Error(`Invalid player data: ${JSON.stringify(p)}`)
            }

            // Validate position
            if (!['QB', 'RB', 'WR', 'TE', 'K'].includes(player.position)) {
                throw new Error(`Invalid position: ${player.position} for player ${player.name}`)
            }

            return player
        })

        // Insert players in batches
        const batchSize = 50
        const insertedPlayers: any[] = []
        const errors: string[] = []

        for (let i = 0; i < playersToInsert.length; i += batchSize) {
            const batch = playersToInsert.slice(i, i + batchSize)

            try {
                const { data, error } = await supabase
                    .from('players')
                    .insert(batch)
                    .select()

                if (error) {
                    errors.push(`Error inserting batch ${Math.floor(i / batchSize) + 1}: ${error.message}`)
                } else if (data) {
                    insertedPlayers.push(...data)
                }
            } catch (error: any) {
                errors.push(`Error inserting batch ${Math.floor(i / batchSize) + 1}: ${error.message}`)
            }
        }

        return NextResponse.json({
            success: true,
            inserted: insertedPlayers.length,
            errors: errors.length > 0 ? errors : undefined
        })
    } catch (error: any) {
        console.error('Error in bulk import:', error)
        return NextResponse.json({ error: error.message || 'Failed to import players' }, { status: 500 })
    }
}
