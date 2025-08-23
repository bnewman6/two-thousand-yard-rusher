import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCurrentNFLWeek(): number {
  // NFL season typically starts in early September
  // This is a simplified calculation - in production you'd want to use an API
  const now = new Date()
  const season_start = new Date(now.getFullYear(), 8, 7) // September 7th
  
  if (now < season_start) {
    return 1
  }
  
  const week_diff = Math.floor((now.getTime() - season_start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
  return Math.min(Math.max(week_diff, 1), 18) // NFL regular season is 18 weeks
}

export function getCurrentNFLSeason(): number {
  const now = new Date()
  // NFL season starts in September, so if we're before September, it's the previous year's season
  return now.getMonth() < 8 ? now.getFullYear() - 1 : now.getFullYear()
}

export function formatYards(yards: number): string {
  return yards.toLocaleString()
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function getYardsToGoal(currentYards: number, goalYards: number = 2000): number {
  return Math.max(0, goalYards - currentYards)
}

export function getProgressPercentage(currentYards: number, goalYards: number = 2000): number {
  return Math.min(100, (currentYards / goalYards) * 100)
}
