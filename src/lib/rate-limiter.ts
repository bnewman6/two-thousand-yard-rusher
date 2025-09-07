/**
 * Rate Limiter for Sportradar API
 * Implements exponential backoff and request queuing
 */

interface RateLimitConfig {
  maxRequestsPerMinute: number
  maxRequestsPerHour: number
  baseDelayMs: number
  maxDelayMs: number
}

class RateLimiter {
  private requestQueue: Array<() => Promise<any>> = []
  private isProcessing = false
  private requestTimes: number[] = []
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
  }

  /**
   * Add a request to the queue with rate limiting
   */
  async executeRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
      
      this.processQueue()
    })
  }

  /**
   * Process the request queue with rate limiting
   */
  private async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return
    }

    this.isProcessing = true

    while (this.requestQueue.length > 0) {
      // Check rate limits
      const now = Date.now()
      const oneMinuteAgo = now - 60 * 1000
      const oneHourAgo = now - 60 * 60 * 1000

      // Remove old request times
      this.requestTimes = this.requestTimes.filter(time => time > oneHourAgo)

      // Check if we're within limits
      const requestsLastMinute = this.requestTimes.filter(time => time > oneMinuteAgo).length
      const requestsLastHour = this.requestTimes.length

      if (requestsLastMinute >= this.config.maxRequestsPerMinute) {
        console.log(`Rate limit: ${requestsLastMinute} requests in last minute, waiting...`)
        await this.delay(60 * 1000) // Wait 1 minute
        continue
      }

      if (requestsLastHour >= this.config.maxRequestsPerHour) {
        console.log(`Rate limit: ${requestsLastHour} requests in last hour, waiting...`)
        await this.delay(60 * 60 * 1000) // Wait 1 hour
        continue
      }

      // Execute the request
      const request = this.requestQueue.shift()
      if (request) {
        this.requestTimes.push(now)
        try {
          await request()
        } catch (error) {
          console.error('Request failed:', error)
          // Implement exponential backoff for failed requests
          if (this.isRateLimitError(error)) {
            const delay = this.calculateBackoffDelay()
            console.log(`Rate limit error, backing off for ${delay}ms`)
            await this.delay(delay)
          }
        }
      }

      // Small delay between requests to be respectful
      await this.delay(100)
    }

    this.isProcessing = false
  }

  /**
   * Check if error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    return error?.status === 429 || 
           error?.message?.includes('Too Many Requests') ||
           error?.message?.includes('rate limit')
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(): number {
    const attempts = this.requestTimes.length
    const delay = Math.min(
      this.config.baseDelayMs * Math.pow(2, attempts),
      this.config.maxDelayMs
    )
    return delay + Math.random() * 1000 // Add jitter
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessing,
      requestsLastMinute: this.requestTimes.filter(time => time > Date.now() - 60 * 1000).length,
      requestsLastHour: this.requestTimes.length
    }
  }
}

// Sportradar trial API rate limits (conservative estimates)
const SPORTRADAR_RATE_LIMITS: RateLimitConfig = {
  maxRequestsPerMinute: 10,  // Conservative limit
  maxRequestsPerHour: 100,   // Conservative limit
  baseDelayMs: 1000,         // 1 second base delay
  maxDelayMs: 30000          // Max 30 seconds delay
}

export const sportradarRateLimiter = new RateLimiter(SPORTRADAR_RATE_LIMITS)
