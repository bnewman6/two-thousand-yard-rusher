'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Users } from 'lucide-react'
import { AdminPasswordDialog } from '@/components/admin-password-dialog'

interface PlayoffsHeaderProps {
  currentPage?: 'dashboard' | 'players' | 'admin'
}

export function PlayoffsHeader({ currentPage }: PlayoffsHeaderProps) {
  const router = useRouter()
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)

  const handleAdminClick = () => {
    // Check if already authenticated in session
    const adminAccess = sessionStorage.getItem('admin_access')
    if (currentPage === 'admin' || adminAccess === 'true') {
      // Already on admin page or authenticated, just navigate
      router.push('/playoffs/admin')
    } else {
      // Show password dialog
      setShowPasswordDialog(true)
    }
  }

  const handlePasswordSuccess = () => {
    // Password is set in dialog component, just navigate
    router.push('/playoffs/admin')
  }

  return (
    <>
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side - Title and Navigation */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <h1 
                className="text-lg sm:text-xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => router.push('/playoffs/dashboard')}
              >
                <span className="hidden sm:inline">Playoffs Fantasy</span>
                <span className="sm:hidden">Playoffs</span>
              </h1>
              <Button
                variant={currentPage === 'dashboard' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => router.push('/playoffs/dashboard')}
                className="hidden sm:flex items-center space-x-2 text-gray-900 [&_svg]:text-gray-900"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </Button>
              <Button
                variant={currentPage === 'players' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => router.push('/playoffs/players')}
                className="hidden sm:flex items-center space-x-2 text-gray-900 [&_svg]:text-gray-900"
              >
                <Users className="h-4 w-4" />
                <span>Players</span>
              </Button>
              <Button
                variant={currentPage === 'admin' ? 'default' : 'ghost'}
                size="sm"
                onClick={handleAdminClick}
                className="hidden sm:flex items-center space-x-2 text-gray-900 [&_svg]:text-gray-900"
              >
                <span>Admin</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <AdminPasswordDialog
        isOpen={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
        onSuccess={handlePasswordSuccess}
      />
    </>
  )
}
