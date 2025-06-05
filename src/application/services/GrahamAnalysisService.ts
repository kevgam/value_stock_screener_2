import { Stock } from '../types/stock';

export type GrahamVerdict = 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';

export class GrahamAnalysisService {
  calculateGrahamNumber(eps: number, bookValuePerShare: number, currency: string, usdRate: number = 1): number {
    // Convert to USD if needed
    const epsUSD = currency === 'USD' ? eps : eps * usdRate;
    const bookValuePerShareUSD = currency === 'USD' ? bookValuePerShare : bookValuePerShare * usdRate;

    // Check for negative or zero values
    if (epsUSD <= 0 || bookValuePerShareUSD <= 0) {
      return 0;
    }

    // Calculate Graham number
    return Math.sqrt(22.5 * epsUSD * bookValuePerShareUSD);
  }

  calculateMarginOfSafety(stock: Stock): number {
    if (!stock.price || !stock.graham_number || stock.graham_number === 0) {
      return 0;
    }
    return ((stock.graham_number - stock.price) / stock.graham_number) * 100;
  }

  determineGrahamVerdict(stock: Stock): GrahamVerdict {
    // Use existing scores if available, otherwise calculate them
    const valueScore = stock.value_score ?? this.calculateValueScore(stock);
    const safetyScore = stock.safety_score ?? this.calculateSafetyScore(stock);
    const marginOfSafety = stock.margin_of_safety ?? this.calculateMarginOfSafety(stock);

    console.log(`Determining verdict for ${stock.symbol}:`, {
      valueScore,
      safetyScore,
      marginOfSafety
    });

    // Strong Buy: High value score, good safety, significant margin of safety
    if (valueScore >= 80 && safetyScore >= 70 && marginOfSafety >= 35) {
      return 'Strong Buy';
    }

    // Buy: Good value score, decent safety, some margin of safety
    if (valueScore >= 60 && safetyScore >= 50 && marginOfSafety >= 20) {
      return 'Buy';
    }

    // Hold: Moderate scores, minimal margin of safety
    if (valueScore >= 40 && safetyScore >= 30 && marginOfSafety >= 0) {
      return 'Hold';
    }

    // Sell: Poor value score or safety
    if (valueScore < 40 || safetyScore < 30) {
      return 'Sell';
    }

    // Strong Sell: Very poor scores
    return 'Strong Sell';
  }

  private calculateValueScore(stock: Stock): number {
    let score = 0;
    
    // Price to Graham number ratio (lower is better)
    if (stock.price && stock.graham_number && stock.graham_number > 0) {
      const priceToGraham = stock.price / stock.graham_number;
      score += (1 - priceToGraham) * 40; // Up to 40 points
    }
    
    // Margin of safety (higher is better)
    const marginOfSafety = this.calculateMarginOfSafety(stock);
    score += Math.min(marginOfSafety, 30); // Up to 30 points
    
    // Price to book ratio (lower is better)
    if (stock.price_to_book && stock.price_to_book > 0) {
      const pbrScore = Math.max(0, 30 - (stock.price_to_book * 10));
      score += pbrScore; // Up to 30 points
    }
    
    return Math.max(0, Math.min(score, 100));
  }

  private calculateSafetyScore(stock: Stock): number {
    let score = 0;
    
    // Current ratio (higher is better)
    if (stock.current_ratio) {
      const currentRatioScore = Math.min(stock.current_ratio / 2, 1) * 25;
      score += currentRatioScore;
    }
    
    // Long-term debt to equity (lower is better)
    if (stock.long_term_debt_to_equity) {
      const debtEquityScore = Math.max(0, 1 - (stock.long_term_debt_to_equity / 0.5)) * 35;
      score += debtEquityScore;
    }
    
    // Earnings stability (positive growth is better)
    if (stock.earnings_growth_5y) {
      const growthScore = Math.min(Math.max(stock.earnings_growth_5y, 0), 0.2) * 20;
      score += growthScore;
    }
    
    // Dividend record (consistent dividends are better)
    if (stock.dividend_yield) {
      const dividendScore = Math.min(stock.dividend_yield / 0.02, 1) * 20;
      score += dividendScore;
    }
    
    return Math.max(0, Math.min(score, 100));
  }
} 