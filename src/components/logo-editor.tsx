'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Save, RotateCcw, Palette } from 'lucide-react'

interface LogoEditorProps {
  isOpen: boolean
  onClose: () => void
  onSave: (logoData: string) => void
  currentLogo?: string
}

const CANVAS_SIZE = 12 // 12x12 pixel canvas
const PIXEL_SIZE = 20 // Size of each pixel in pixels

const COLORS = [
  '#000000', // Black
  '#FFFFFF', // White
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#FFA500', // Orange
  '#800080', // Purple
  '#008000', // Dark Green
  '#FFC0CB', // Pink
  '#A52A2A', // Brown
  '#808080', // Gray
  '#FFD700', // Gold
  '#C0C0C0', // Silver
]

export function LogoEditor({ isOpen, onClose, onSave, currentLogo }: LogoEditorProps) {
  const [selectedColor, setSelectedColor] = useState('#000000')
  const [isDrawing, setIsDrawing] = useState(false)
  const [pixels, setPixels] = useState<string[][]>([])
  const canvasRef = useRef<HTMLDivElement>(null)

  // Initialize canvas with current logo or empty grid
  useEffect(() => {
    if (isOpen) {
      if (currentLogo) {
        try {
          const logoData = JSON.parse(currentLogo)
          setPixels(logoData)
        } catch {
          initializeEmptyCanvas()
        }
      } else {
        initializeEmptyCanvas()
      }
    }
  }, [isOpen, currentLogo])

  const initializeEmptyCanvas = () => {
    const emptyCanvas = Array(CANVAS_SIZE).fill(null).map(() => 
      Array(CANVAS_SIZE).fill('#FFFFFF')
    )
    setPixels(emptyCanvas)
  }

  const handleMouseDown = (row: number, col: number) => {
    setIsDrawing(true)
    setPixel(row, col)
  }

  const handleMouseEnter = (row: number, col: number) => {
    if (isDrawing) {
      setPixel(row, col)
    }
  }

  const handleMouseUp = () => {
    setIsDrawing(false)
  }

  const handleMouseLeave = () => {
    setIsDrawing(false)
  }

  const setPixel = (row: number, col: number) => {
    setPixels(prev => {
      const newPixels = prev.map(row => [...row])
      newPixels[row][col] = selectedColor
      return newPixels
    })
  }

  const clearCanvas = () => {
    initializeEmptyCanvas()
  }

  const handleSave = () => {
    const logoData = JSON.stringify(pixels)
    onSave(logoData)
    onClose()
  }

  const handleCancel = () => {
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-white bg-opacity-10 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className="w-full max-w-xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-2xl">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Palette className="h-5 w-5" />
              <span>8-Bit Logo Editor</span>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="text-white hover:bg-white hover:bg-opacity-20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Color Palette */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Colors</h3>
            <div className="grid grid-cols-8 gap-1 sm:gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  className={`w-8 h-8 rounded border-2 transition-all ${
                    selectedColor === color 
                      ? 'border-gray-800 scale-110 shadow-lg' 
                      : 'border-gray-300 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Canvas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">Canvas (12x12)</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={clearCanvas}
                className="flex items-center space-x-1"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Clear</span>
              </Button>
            </div>
            
            <div className="flex justify-center">
              <div 
                ref={canvasRef}
                className="border-2 border-gray-300 bg-white inline-block select-none max-w-full"
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
              >
                {pixels.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex">
                    {row.map((color, colIndex) => (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className="border border-gray-200 cursor-crosshair hover:opacity-80 transition-opacity"
                        style={{
                          width: PIXEL_SIZE,
                          height: PIXEL_SIZE,
                          backgroundColor: color,
                        }}
                        onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                        onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                        onMouseUp={handleMouseUp}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-800 mb-1">How to use:</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Click a color from the palette above</li>
              <li>• Click and drag on the canvas to draw</li>
              <li>• Use the Clear button to start over</li>
              <li>• Your logo will be saved as a 12x12 pixel image</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex items-center space-x-2 w-full sm:w-auto"
            >
              <Save className="h-4 w-4" />
              <span>Save Logo</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
