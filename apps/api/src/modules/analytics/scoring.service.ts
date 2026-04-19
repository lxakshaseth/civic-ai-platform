import { SCORING_CONFIG } from "constants/scoring";

type ScoreInput = {
  resolutionRate: number;
  pendingRatio: number;
  averageResolutionHours: number;
  citizenSatisfaction: number;
  backlogCount: number;
};

type WeightSet = {
  resolutionRate: number;
  pendingRatio: number;
  averageResolutionTime: number;
  citizenSatisfaction: number;
  backlog: number;
};

type ScoreBreakdownItem = {
  value: number;
  score: number;
  weight: number;
  contribution: number;
};

export interface ScoreBreakdown {
  resolutionRate: ScoreBreakdownItem;
  pendingRatio: ScoreBreakdownItem;
  averageResolutionTime: ScoreBreakdownItem & {
    targetHours: number;
  };
  citizenSatisfaction: ScoreBreakdownItem & {
    maxRating: number;
  };
  backlog: ScoreBreakdownItem & {
    referenceCount: number;
  };
}

export interface ScoringResult {
  score: number;
  breakdown: ScoreBreakdown;
}

const clampScore = (value: number) => Math.max(0, Math.min(100, value));

const buildWeightedBreakdown = (input: ScoreInput, weights: WeightSet): ScoringResult => {
  const resolutionRateScore = clampScore(input.resolutionRate);
  const pendingRatioScore = clampScore(100 - input.pendingRatio);
  const averageResolutionTimeScore = clampScore(
    100 - (input.averageResolutionHours / SCORING_CONFIG.targetResolutionHours) * 100
  );
  const citizenSatisfactionScore = clampScore((input.citizenSatisfaction / 5) * 100);
  const backlogScore = clampScore(
    100 - (input.backlogCount / SCORING_CONFIG.backlogReferenceCount) * 100
  );

  const breakdown: ScoreBreakdown = {
    resolutionRate: {
      value: input.resolutionRate,
      score: resolutionRateScore,
      weight: weights.resolutionRate,
      contribution: Number((resolutionRateScore * weights.resolutionRate).toFixed(2))
    },
    pendingRatio: {
      value: input.pendingRatio,
      score: pendingRatioScore,
      weight: weights.pendingRatio,
      contribution: Number((pendingRatioScore * weights.pendingRatio).toFixed(2))
    },
    averageResolutionTime: {
      value: input.averageResolutionHours,
      targetHours: SCORING_CONFIG.targetResolutionHours,
      score: averageResolutionTimeScore,
      weight: weights.averageResolutionTime,
      contribution: Number((averageResolutionTimeScore * weights.averageResolutionTime).toFixed(2))
    },
    citizenSatisfaction: {
      value: input.citizenSatisfaction,
      maxRating: 5,
      score: citizenSatisfactionScore,
      weight: weights.citizenSatisfaction,
      contribution: Number((citizenSatisfactionScore * weights.citizenSatisfaction).toFixed(2))
    },
    backlog: {
      value: input.backlogCount,
      referenceCount: SCORING_CONFIG.backlogReferenceCount,
      score: backlogScore,
      weight: weights.backlog,
      contribution: Number((backlogScore * weights.backlog).toFixed(2))
    }
  };

  const score = Number(
    (
      breakdown.resolutionRate.contribution +
      breakdown.pendingRatio.contribution +
      breakdown.averageResolutionTime.contribution +
      breakdown.citizenSatisfaction.contribution +
      breakdown.backlog.contribution
    ).toFixed(2)
  );

  return {
    score,
    breakdown
  };
};

export class ScoringService {
  /**
   * Deterministic city score:
   * 1. Higher resolution rate increases score.
   * 2. Higher pending ratio lowers score.
   * 3. Slower average resolution time lowers score against the configured target.
   * 4. Better citizen ratings increase score.
   * 5. Higher raw backlog lowers score against a configurable reference count.
   */
  calculateCityHealthScore(input: ScoreInput) {
    return buildWeightedBreakdown(input, SCORING_CONFIG.cityHealthWeights);
  }

  /**
   * Department score uses the same factors as the city score,
   * but applies department-specific weights from the shared config.
   */
  calculateDepartmentPerformanceScore(input: ScoreInput) {
    return buildWeightedBreakdown(input, SCORING_CONFIG.departmentWeights);
  }
}
