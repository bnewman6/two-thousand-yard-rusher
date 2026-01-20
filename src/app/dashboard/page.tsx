import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  // Redirect to playoffs dashboard
  redirect('/playoffs/dashboard')
}
