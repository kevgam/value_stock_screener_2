const FINNHUB_RATE_LIMITS = {
  REQUESTS_PER_MINUTE: 60,
  REQUESTS_PER_SECOND: 30,
};

export class RateLimiter {
  private static instance: RateLimiter;
  private requestsThisMinute: number = 0;
  private requestsThisSecond: number = 0;
  private lastMinuteReset: number = Date.now();
  private lastSecondReset: number = Date.now();
  private readonly MAX_REQUESTS_PER_MINUTE: number = 50; // Reduced from 60 to 50
  private readonly MAX_REQUESTS_PER_SECOND: number = 20; // Reduced from 30 to 20
  private readonly MINUTE_INTERVAL: number = 60 * 1000;
  private readonly SECOND_INTERVAL: number = 1000;

  private constructor() {}

  public static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  private resetCountersIfNeeded(): void {
    const now = Date.now();
    
    // Reset minute counter if needed
    if (now - this.lastMinuteReset >= this.MINUTE_INTERVAL) {
      this.requestsThisMinute = 0;
      this.lastMinuteReset = now;
    }
    
    // Reset second counter if needed
    if (now - this.lastSecondReset >= this.SECOND_INTERVAL) {
      this.requestsThisSecond = 0;
      this.lastSecondReset = now;
    }
  }

  public async checkRateLimit(operation: string): Promise<void> {
    this.resetCountersIfNeeded();

    // Check if we've hit the minute limit
    if (this.requestsThisMinute >= this.MAX_REQUESTS_PER_MINUTE) {
      const waitTime = this.MINUTE_INTERVAL - (Date.now() - this.lastMinuteReset);
      console.log(`[${operation}] Minute rate limit reached. Waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.resetCountersIfNeeded();
    }

    // Check if we've hit the second limit
    if (this.requestsThisSecond >= this.MAX_REQUESTS_PER_SECOND) {
      const waitTime = this.SECOND_INTERVAL - (Date.now() - this.lastSecondReset);
      console.log(`[${operation}] Second rate limit reached. Waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.resetCountersIfNeeded();
    }

    // Increment counters
    this.requestsThisMinute++;
    this.requestsThisSecond++;
  }
} 