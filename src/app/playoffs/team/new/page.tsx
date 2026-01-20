import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { PlayoffsHeader } from '@/components/playoffs-header'
import { TeamEditorClient } from '@/components/playoffs-team-editor-client'

export default async function NewTeamPage() {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/auth')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PlayoffsHeader currentPage="team" />
      <TeamEditorClient userId={user.id} teamId={null} />
    </div>
  )
}

