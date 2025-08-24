'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { LogOut, User, Settings, LayoutDashboard } from 'lucide-react'
import { LogoDisplaySimple } from '@/components/logo-display'

interface HeaderProps {
  teamName?: string
  teamLogoData?: string
  currentPage?: 'dashboard' | 'profile'
}

export function Header({ teamName, teamLogoData, currentPage }: HeaderProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <h1 
              className="text-xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => router.push('/dashboard')}
            >
              Fantasy Football Rush
            </h1>
            <Button
              variant={currentPage === 'dashboard' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => router.push('/dashboard')}
              className={`flex items-center space-x-2 ${
                currentPage === 'dashboard' ? 'shadow-md' : ''
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Button>
          </div>
          
          <div className="flex items-center space-x-4">
            {teamName && (
              <Button
                variant={currentPage === 'profile' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => router.push('/profile')}
                className={`flex items-center space-x-2 ${
                  currentPage === 'profile' ? 'shadow-md' : ''
                }`}
              >
                {teamLogoData ? (
                  <LogoDisplaySimple logoData={teamLogoData} size="xs" />
                ) : (
                  <User className="h-4 w-4" />
                )}
                <span>{teamName}</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
