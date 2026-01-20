import { PlayoffsHeader } from '@/components/playoffs-header'
import { PlayoffsDashboardClient } from '@/components/playoffs-dashboard-client'

export default async function PlayoffsDashboardPage() {
  // No auth required - just show the dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      <PlayoffsHeader currentPage="dashboard" />
      <PlayoffsDashboardClient />
    </div>
  )
}
