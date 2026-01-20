'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PlayoffsHeader } from '@/components/playoffs-header'
import { PlayoffsAdminClient } from '@/components/playoffs-admin-client'
import { AdminPasswordDialog } from '@/components/admin-password-dialog'

export default function PlayoffsAdminPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)

  useEffect(() => {
    // Check if password was already entered in this session
    const adminAccess = sessionStorage.getItem('admin_access')
    if (adminAccess === 'true') {
      setIsAuthenticated(true)
    } else {
      // Show password dialog on mount
      setShowPasswordDialog(true)
    }
  }, [])

  const handlePasswordSuccess = () => {
    // Store admin access in session storage
    sessionStorage.setItem('admin_access', 'true')
    setIsAuthenticated(true)
    setShowPasswordDialog(false)
  }

  const handlePasswordCancel = () => {
    // Redirect to dashboard if password is cancelled
    router.push('/playoffs/dashboard')
  }

  // Show password dialog or redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen bg-gray-50">
          <PlayoffsHeader currentPage="admin" />
        </div>
        <AdminPasswordDialog
          isOpen={showPasswordDialog}
          onClose={handlePasswordCancel}
          onSuccess={handlePasswordSuccess}
        />
      </>
    )
  }

  // Show admin page if authenticated
  return (
    <div className="min-h-screen bg-gray-50">
      <PlayoffsHeader currentPage="admin" />
      <PlayoffsAdminClient />
    </div>
  )
}
