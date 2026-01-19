import { redirect } from 'next/navigation'

export default function Home() {
  // Redirect directly to dashboard (no auth needed)
  redirect('/playoffs/dashboard')
}
