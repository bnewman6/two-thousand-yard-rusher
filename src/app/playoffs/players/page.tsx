import { PlayersClient } from '@/components/playoffs-players-client'
import { PlayoffsHeader } from '@/components/playoffs-header'

export default async function PlayersPage() {
  // No auth required
  return (
    <div className="min-h-screen bg-gray-50">
      <PlayoffsHeader currentPage="players" />
      <PlayersClient />
    </div>
  )
}
