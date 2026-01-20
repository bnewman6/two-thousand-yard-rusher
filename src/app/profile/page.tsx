import { redirect } from 'next/navigation'

export default async function ProfilePage() {
  // Redirect to playoffs dashboard (old profile page no longer used)
  redirect('/playoffs/dashboard')
}
