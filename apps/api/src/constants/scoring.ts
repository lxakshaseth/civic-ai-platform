export const SCORING_CONFIG = {
  targetResolutionHours: 48,
  backlogReferenceCount: 100,
  hotspotGridPrecision: 2,
  geoRiskReferenceCount: 25,
  cityHealthWeights: {
    resolutionRate: 0.32,
    pendingRatio: 0.18,
    averageResolutionTime: 0.18,
    citizenSatisfaction: 0.17,
    backlog: 0.15
  },
  departmentWeights: {
    resolutionRate: 0.3,
    pendingRatio: 0.2,
    averageResolutionTime: 0.2,
    citizenSatisfaction: 0.15,
    backlog: 0.15
  },
  geoRiskWeights: {
    complaintFrequency: 0.55,
    unresolvedPressure: 0.45
  }
} as const;
