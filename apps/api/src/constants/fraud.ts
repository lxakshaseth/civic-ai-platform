export const FRAUD_CONFIG = {
  duplicateTimeWindowDays: 90,
  repeatReporterWindowHours: 48,
  suspiciousReporterWindowDays: 30,
  repeatReporterThreshold: 3,
  suspiciousReporterThreshold: 8,
  nearbyRadiusKm: 1.5,
  duplicateWeights: {
    textSimilarity: 0.55,
    categoryMatch: 0.2,
    nearbyLocation: 0.25
  },
  sameAreaLocationScore: 0.15,
  similarComplaintThreshold: 0.55,
  repeatReporterStepScore: 0.05,
  repeatReporterMaxScore: 0.2,
  similarRepeatScore: 0.1,
  suspiciousReporterScore: 0.25,
  duplicateThreshold: 0.72,
  fraudAlertThreshold: 0.6,
  highAlertThreshold: 0.85
} as const;
