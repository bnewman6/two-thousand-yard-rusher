'use client'

import { Button } from '@/components/ui/button'
import { Edit3 } from 'lucide-react'

interface LogoDisplayProps {
  logoData?: string
  onEdit: () => void
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

interface LogoDisplaySimpleProps {
  logoData?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

const PIXEL_SIZES = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12
}

// Simple logo display component for read-only contexts
export function LogoDisplaySimple({ logoData, size = 'md' }: LogoDisplaySimpleProps) {
  const pixelSize = PIXEL_SIZES[size]

  const renderLogo = () => {
    if (!logoData) {
      // Show placeholder
      return (
        <div className="flex items-center justify-center text-gray-400 text-xs">
          No logo yet
        </div>
      )
    }

    try {
      const pixels = JSON.parse(logoData)
      return (
        <div className="border border-gray-300 bg-white inline-block">
          {pixels.map((row: string[], rowIndex: number) => (
            <div key={rowIndex} className="flex">
              {row.map((color: string, colIndex: number) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  style={{
                    width: pixelSize,
                    height: pixelSize,
                    backgroundColor: color,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      )
    } catch {
      return (
        <div className="flex items-center justify-center text-gray-400 text-xs">
          Invalid logo data
        </div>
      )
    }
  }

  return (
    <div className="flex-shrink-0">
      {renderLogo()}
    </div>
  )
}

export function LogoDisplay({ logoData, onEdit, size = 'md' }: LogoDisplayProps) {
  const pixelSize = PIXEL_SIZES[size]

  const renderLogo = () => {
    if (!logoData) {
      // Show placeholder
      return (
        <div className="flex items-center justify-center text-gray-400 text-xs">
          No logo yet
        </div>
      )
    }

    try {
      const pixels = JSON.parse(logoData)
      return (
        <div className="border border-gray-300 bg-white inline-block">
          {pixels.map((row: string[], rowIndex: number) => (
            <div key={rowIndex} className="flex">
              {row.map((color: string, colIndex: number) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  style={{
                    width: pixelSize,
                    height: pixelSize,
                    backgroundColor: color,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      )
    } catch {
      return (
        <div className="flex items-center justify-center text-gray-400 text-xs">
          Invalid logo data
        </div>
      )
    }
  }

  return (
    <div className="flex items-center space-x-3">
      <div className="flex-shrink-0">
        {renderLogo()}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onEdit}
        className="flex items-center space-x-1"
      >
        <Edit3 className="h-3 w-3" />
        <span>Edit Logo</span>
      </Button>
    </div>
  )
}
