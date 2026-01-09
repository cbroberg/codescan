import { getLogger } from '../../utils/logger.js';
import { RankedResult } from '@codescan/shared';

export interface ScoringSignals {
  semanticScore: number; // 0-100 from Claude
  keywordScore: number; // 0-100 from FTS
  recencyScore: number; // 0-100 based on last_modified
  simplicityScore: number; // 0-100 based on LOC
  techMatchScore: number; // 0-100 for exact tech match
}

/**
 * Ranks search results using multiple signals
 */
export class SearchRanker {
  private logger = getLogger();

  // Weights for different signals
  private weights = {
    semantic: 0.5, // Most important - Claude's understanding
    keyword: 0.2, // Keyword match quality
    recency: 0.1, // Prefer recent files
    simplicity: 0.1, // Prefer readable code
    techMatch: 0.1, // Exact technology match
  };

  /**
   * Rank results using weighted scoring
   */
  public rank(
    results: Array<{
      chunkId: string;
      signals: ScoringSignals;
    }>,
  ): RankedResult[] {
    return results
      .map((result) => {
        const finalScore =
          this.weights.semantic * (result.signals.semanticScore / 100) +
          this.weights.keyword * (result.signals.keywordScore / 100) +
          this.weights.recency * (result.signals.recencyScore / 100) +
          this.weights.simplicity * (result.signals.simplicityScore / 100) +
          this.weights.techMatch * (result.signals.techMatchScore / 100);

        return {
          chunkId: result.chunkId,
          finalScore: Math.round(finalScore * 100), // 0-100
          signals: result.signals,
        };
      })
      .sort((a, b) => b.finalScore - a.finalScore);
  }

  /**
   * Calculate keyword score based on match quality
   */
  public calculateKeywordScore(
    matchedTerms: string[],
    totalTerms: number,
  ): number {
    if (totalTerms === 0) return 0;

    const matchRatio = matchedTerms.length / totalTerms;
    return Math.round(matchRatio * 100);
  }

  /**
   * Calculate recency score
   */
  public calculateRecencyScore(lastModified: Date): number {
    const now = new Date();
    const ageInDays = (now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24);

    // Decay: newer = higher score
    // 0 days = 100, 30 days = 75, 90 days = 50, 365 days = 10
    if (ageInDays === 0) return 100;
    if (ageInDays < 7) return 95;
    if (ageInDays < 30) return 80;
    if (ageInDays < 90) return 60;
    if (ageInDays < 180) return 40;
    if (ageInDays < 365) return 20;

    return 10;
  }

  /**
   * Calculate simplicity score based on code length
   */
  public calculateSimplicityScore(lineCount: number): number {
    // Prefer shorter, more focused code
    // <50 lines = 100, 50-100 = 80, 100-200 = 60, 200-500 = 40, >500 = 20
    if (lineCount < 50) return 100;
    if (lineCount < 100) return 85;
    if (lineCount < 200) return 70;
    if (lineCount < 500) return 50;
    if (lineCount < 1000) return 30;

    return 10;
  }

  /**
   * Calculate technology match score
   */
  public calculateTechMatchScore(
    requiredTechs: string[],
    availableTechs: string[],
  ): number {
    if (requiredTechs.length === 0) return 0;

    const matches = requiredTechs.filter((tech) =>
      availableTechs.some((available) => available.toLowerCase().includes(tech.toLowerCase())),
    );

    return Math.round((matches.length / requiredTechs.length) * 100);
  }

  /**
   * Adjust weights based on query intent
   */
  public adjustWeightsForIntent(intent: string): void {
    // Reset to defaults
    this.weights = {
      semantic: 0.5,
      keyword: 0.2,
      recency: 0.1,
      simplicity: 0.1,
      techMatch: 0.1,
    };

    // Adjust based on intent
    const intentLower = intent.toLowerCase();

    if (
      intentLower.includes('notification') ||
      intentLower.includes('integration') ||
      intentLower.includes('sdk')
    ) {
      // Tech match is important for integrations
      this.weights.techMatch = 0.2;
      this.weights.simplicity = 0.05;
    }

    if (intentLower.includes('pattern') || intentLower.includes('example')) {
      // Prefer simpler, readable code for examples
      this.weights.simplicity = 0.2;
      this.weights.recency = 0.05;
    }

    if (intentLower.includes('recent') || intentLower.includes('new')) {
      // Prioritize recent code
      this.weights.recency = 0.2;
      this.weights.semantic = 0.4;
    }

    // Normalize weights to sum to 1
    const sum = Object.values(this.weights).reduce((a, b) => a + b, 0);
    Object.keys(this.weights).forEach((key) => {
      this.weights[key as keyof typeof this.weights] /= sum;
    });

    this.logger.debug(`Adjusted weights for intent: ${intent}`, this.weights);
  }

  /**
   * Get current weights
   */
  public getWeights(): typeof this.weights {
    return { ...this.weights };
  }
}
