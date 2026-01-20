'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Mail, Lock, User, AlertCircle } from 'lucide-react'

export function AuthForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  const handleSignIn = async (formData: FormData) => {
    setIsLoading(true)
    setError(null)

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
      } else {
        console.log('Sign in successful, redirecting to dashboard...')
        router.push('/playoffs/dashboard')
      }
    } catch (error) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (formData: FormData) => {
    setIsLoading(true)
    setError(null)
    setMessage(null)

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const teamName = formData.get('teamName') as string

    console.log('Starting signup process for:', email, 'with team:', teamName)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            team_name: teamName,
          },
        },
      })

      console.log('Signup response:', { data, error })

      if (error) {
        console.error('Signup error:', error)
        setError(error.message)
      } else if (data.user) {
        console.log('User created:', data.user)
        console.log('Email confirmed at:', data.user.email_confirmed_at)
        
        // Profile is automatically created by database trigger
        if (data.user.email_confirmed_at) {
          // Email already confirmed, redirect to dashboard
          console.log('Sign up successful, redirecting to dashboard...')
          router.push('/playoffs/dashboard')
        } else {
          // Email confirmation required
          console.log('Email confirmation required, showing message')
          setMessage('Account created successfully! Please check your email to confirm your account before signing in. You can then sign in with your credentials.')
          
          // Let's also check if the profile was created
          setTimeout(async () => {
            try {
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user!.id)
                .single()
              
              console.log('Profile check result:', { profileData, profileError })
            } catch (e) {
              console.error('Profile check error:', e)
            }
          }, 1000)
        }
      }
    } catch (error) {
      console.error('Unexpected error during signup:', error)
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">Playoffs Fantasy Challenge</CardTitle>
          <CardDescription className="text-gray-700">
            Build your playoff team of 17 players and compete for the championship!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full" onValueChange={() => { setError(null); setMessage(null); }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin" className="text-gray-600 data-[state=active]:text-white">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="text-gray-600 data-[state=active]:text-white">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form action={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-gray-900">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      className="pl-10 bg-white text-gray-900 placeholder:text-gray-500"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-gray-900">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10 bg-white text-gray-900 placeholder:text-gray-500"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form action={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-gray-900">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      className="pl-10 bg-white text-gray-900 placeholder:text-gray-500"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team-name" className="text-gray-900">Team Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="team-name"
                      name="teamName"
                      type="text"
                      placeholder="Your team name"
                      className="pl-10 bg-white text-gray-900 placeholder:text-gray-500"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-gray-900">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10 bg-white text-gray-900 placeholder:text-gray-500"
                      minLength={6}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading}>
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          {message && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700">
              <p className="text-sm">{message}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
