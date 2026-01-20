'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X } from 'lucide-react'

interface AdminPasswordDialogProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function AdminPasswordDialog({ isOpen, onClose, onSuccess }: AdminPasswordDialogProps) {
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    if (!isOpen) return null

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (password === '123456') {
            setPassword('')
            // Store admin access in session storage
            sessionStorage.setItem('admin_access', 'true')
            onSuccess()
            onClose()
        } else {
            setError('Incorrect password')
            setPassword('')
        }
    }

    const handleCancel = () => {
        setPassword('')
        setError('')
        onClose()
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            handleCancel()
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    handleCancel()
                }
            }}
            onKeyDown={handleKeyDown}
        >
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Admin Access</h2>
                    <button
                        onClick={handleCancel}
                        className="text-gray-500 hover:text-gray-700"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-gray-900">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value)
                                setError('')
                            }}
                            placeholder="Enter admin password"
                            className="bg-white text-gray-900 placeholder:text-gray-500"
                            autoFocus
                        />
                        {error && (
                            <p className="text-sm text-red-600">{error}</p>
                        )}
                    </div>

                    <div className="flex gap-2 justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            Submit
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
