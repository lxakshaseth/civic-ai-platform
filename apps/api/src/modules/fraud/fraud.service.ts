import { ComplaintStatus } from "@prisma/client";

import { FRAUD_CONFIG } from "constants/fraud";
import { buildAreaKey, calculateDistanceKm } from "utils/geo";
import { calculateTextSimilarity } from "utils/text";

import { FraudRepository } from "./fraud.repository";

type ComplaintDraft = {
  citizenId: string;
  title: string;
  description: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  locationAddress?: string;
  excludeComplaintId?: string;
};

type FraudReason = {
  code: string;
  title: string;
  score: number;
  details: Record<string, unknown>;
};

type AlertLevel = "LOW" | "MEDIUM" | "HIGH";

const normalizeCategory = (value?: string | null) => value?.trim().toLowerCase() ?? null;

const createReason = (
  code: string,
  title: string,
  score: number,
  details: Record<string, unknown>
): FraudReason => ({
  code,
  title,
  score: Number(score.toFixed(2)),
  details
});

export class FraudService {
  constructor(private readonly fraudRepository: FraudRepository = new FraudRepository()) {}

  async evaluateComplaintDraft(input: ComplaintDraft) {
    const recentComplaints = await this.fraudRepository.findComplaintsForHeuristics(
      new Date(Date.now() - FRAUD_CONFIG.duplicateTimeWindowDays * 24 * 60 * 60 * 1000)
    );

    const combinedText = `${input.title} ${input.description}`.trim();
    const normalizedCategory = normalizeCategory(input.category);
    const areaKey = buildAreaKey(input.locationAddress, input.latitude, input.longitude);
    const repeatWindowStart = new Date(
      Date.now() - FRAUD_CONFIG.repeatReporterWindowHours * 60 * 60 * 1000
    );
    const suspiciousWindowStart = new Date(
      Date.now() - FRAUD_CONFIG.suspiciousReporterWindowDays * 24 * 60 * 60 * 1000
    );

    let bestDuplicate = {
      complaintId: undefined as string | undefined,
      score: 0,
      textSimilarity: 0,
      categoryMatch: false,
      locationScore: 0,
      distanceKm: null as number | null,
      sameArea: false
    };

    let sameReporterSimilarRecent = 0;

    for (const complaint of recentComplaints) {
      if (complaint.id === input.excludeComplaintId) {
        continue;
      }

      const textSimilarity = calculateTextSimilarity(
        combinedText,
        `${complaint.title} ${complaint.description}`.trim()
      );
      const candidateCategory = normalizeCategory(complaint.category ?? complaint.aiCategory);
      const categoryMatch = Boolean(
        normalizedCategory && candidateCategory && normalizedCategory === candidateCategory
      );
      const distanceKm = calculateDistanceKm(
        {
          latitude: input.latitude,
          longitude: input.longitude
        },
        {
          latitude: complaint.latitude != null ? Number(complaint.latitude) : undefined,
          longitude: complaint.longitude != null ? Number(complaint.longitude) : undefined
        }
      );
      const sameArea =
        areaKey !== "Unknown" &&
        areaKey ===
          buildAreaKey(
            complaint.locationAddress,
            complaint.latitude != null ? Number(complaint.latitude) : undefined,
            complaint.longitude != null ? Number(complaint.longitude) : undefined
          );

      const locationScore =
        distanceKm != null
          ? distanceKm <= FRAUD_CONFIG.nearbyRadiusKm
            ? FRAUD_CONFIG.duplicateWeights.nearbyLocation
            : 0
          : sameArea
            ? FRAUD_CONFIG.sameAreaLocationScore
            : 0;

      const duplicateScore = Math.min(
        1,
        textSimilarity * FRAUD_CONFIG.duplicateWeights.textSimilarity +
          (categoryMatch ? FRAUD_CONFIG.duplicateWeights.categoryMatch : 0) +
          locationScore
      );

      if (duplicateScore > bestDuplicate.score) {
        bestDuplicate = {
          complaintId: complaint.id,
          score: duplicateScore,
          textSimilarity,
          categoryMatch,
          locationScore,
          distanceKm,
          sameArea
        };
      }

      if (
        complaint.citizenId === input.citizenId &&
        complaint.createdAt >= repeatWindowStart &&
        textSimilarity >= FRAUD_CONFIG.similarComplaintThreshold &&
        (sameArea || (distanceKm != null && distanceKm <= FRAUD_CONFIG.nearbyRadiusKm))
      ) {
        sameReporterSimilarRecent += 1;
      }
    }

    const sameReporterRecent = recentComplaints.filter(
      (complaint) =>
        complaint.id !== input.excludeComplaintId &&
        complaint.citizenId === input.citizenId &&
        complaint.createdAt >= repeatWindowStart
    ).length;
    const sameReporterMonthly = recentComplaints.filter(
      (complaint) =>
        complaint.id !== input.excludeComplaintId &&
        complaint.citizenId === input.citizenId &&
        complaint.createdAt >= suspiciousWindowStart
    ).length;

    const repeatReporterScore = Math.min(
      FRAUD_CONFIG.repeatReporterMaxScore,
      sameReporterRecent * FRAUD_CONFIG.repeatReporterStepScore
    );
    const similarRepeatScore =
      sameReporterSimilarRecent > 0 ? FRAUD_CONFIG.similarRepeatScore : 0;
    const suspiciousReporterScore =
      sameReporterMonthly >= FRAUD_CONFIG.suspiciousReporterThreshold
        ? FRAUD_CONFIG.suspiciousReporterScore
        : 0;

    const duplicateScore = Number(bestDuplicate.score.toFixed(2));
    const fraudScore = Number(
      Math.min(
        1,
        duplicateScore * 0.5 + repeatReporterScore + similarRepeatScore + suspiciousReporterScore
      ).toFixed(2)
    );
    const isSuspicious =
      duplicateScore >= FRAUD_CONFIG.duplicateThreshold ||
      fraudScore >= FRAUD_CONFIG.fraudAlertThreshold;
    const alertLevel: AlertLevel =
      duplicateScore >= FRAUD_CONFIG.highAlertThreshold || fraudScore >= FRAUD_CONFIG.highAlertThreshold
        ? "HIGH"
        : isSuspicious
          ? "MEDIUM"
          : "LOW";

    const reasons: FraudReason[] = [];
    const signals: string[] = [];

    if (bestDuplicate.complaintId && duplicateScore >= FRAUD_CONFIG.duplicateThreshold) {
      reasons.push(
        createReason("POSSIBLE_DUPLICATE", "Possible duplicate complaint", duplicateScore, {
          matchedComplaintId: bestDuplicate.complaintId,
          textSimilarity: Number(bestDuplicate.textSimilarity.toFixed(2)),
          categoryMatch: bestDuplicate.categoryMatch,
          locationScore: Number(bestDuplicate.locationScore.toFixed(2)),
          distanceKm:
            bestDuplicate.distanceKm != null ? Number(bestDuplicate.distanceKm.toFixed(2)) : null,
          sameArea: bestDuplicate.sameArea
        })
      );
      signals.push(`Possible duplicate of complaint ${bestDuplicate.complaintId}`);
    }

    if (sameReporterRecent >= FRAUD_CONFIG.repeatReporterThreshold) {
      reasons.push(
        createReason("REPEAT_REPORTER_SHORT_WINDOW", "Frequent reporter in short window", repeatReporterScore, {
          complaintCount: sameReporterRecent,
          windowHours: FRAUD_CONFIG.repeatReporterWindowHours
        })
      );
      signals.push(
        `Reporter created ${sameReporterRecent} complaints in the last ${FRAUD_CONFIG.repeatReporterWindowHours} hours`
      );
    }

    if (sameReporterSimilarRecent > 0) {
      reasons.push(
        createReason("REPEAT_REPORTER_SIMILAR_LOCATION", "Repeated similar complaint near same location", similarRepeatScore, {
          complaintCount: sameReporterSimilarRecent,
          similarityThreshold: FRAUD_CONFIG.similarComplaintThreshold,
          nearbyRadiusKm: FRAUD_CONFIG.nearbyRadiusKm
        })
      );
      signals.push(`Reporter repeated similar complaints near the same location ${sameReporterSimilarRecent} time(s)`);
    }

    if (sameReporterMonthly >= FRAUD_CONFIG.suspiciousReporterThreshold) {
      reasons.push(
        createReason("SUSPICIOUS_REPORTER_THRESHOLD", "Reporter exceeded monthly complaint threshold", suspiciousReporterScore, {
          complaintCount: sameReporterMonthly,
          windowDays: FRAUD_CONFIG.suspiciousReporterWindowDays
        })
      );
      signals.push(
        `Reporter created ${sameReporterMonthly} complaints in the last ${FRAUD_CONFIG.suspiciousReporterWindowDays} days`
      );
    }

    return {
      duplicateScore,
      fraudScore,
      duplicateComplaintId: bestDuplicate.complaintId,
      isSuspicious,
      alertLevel,
      signals,
      reasons,
      explanation: {
        duplicateCandidate: {
          complaintId: bestDuplicate.complaintId ?? null,
          textSimilarity: Number(bestDuplicate.textSimilarity.toFixed(2)),
          categoryMatch: bestDuplicate.categoryMatch,
          locationScore: Number(bestDuplicate.locationScore.toFixed(2)),
          distanceKm:
            bestDuplicate.distanceKm != null ? Number(bestDuplicate.distanceKm.toFixed(2)) : null,
          sameArea: bestDuplicate.sameArea
        },
        reporterActivity: {
          recentComplaintCount: sameReporterRecent,
          similarRecentComplaintCount: sameReporterSimilarRecent,
          monthlyComplaintCount: sameReporterMonthly
        },
        thresholds: {
          duplicateThreshold: FRAUD_CONFIG.duplicateThreshold,
          fraudAlertThreshold: FRAUD_CONFIG.fraudAlertThreshold,
          repeatReporterThreshold: FRAUD_CONFIG.repeatReporterThreshold,
          suspiciousReporterThreshold: FRAUD_CONFIG.suspiciousReporterThreshold
        }
      }
    };
  }

  async listAlerts(filters?: {
    departmentId?: string;
    status?: ComplaintStatus;
    reasonCode?: string;
    limit?: number;
    minScore?: number;
  }) {
    const alerts = await this.fraudRepository.listAlerts({
      departmentId: filters?.departmentId,
      status: filters?.status,
      limit: filters?.limit,
      minScore: filters?.minScore
    });

    return alerts
      .map((alert) => {
        const analysis = this.normalizeFraudAnalysis(alert.fraudSignals);
        return {
          complaintId: alert.id,
          title: alert.title,
          description: alert.description,
          status: alert.status,
          category: alert.category ?? alert.aiCategory ?? null,
          priority: alert.priority,
          locationAddress: alert.locationAddress,
          scores: {
            duplicateScore: alert.duplicateScore ?? 0,
            fraudScore: alert.fraudScore ?? 0
          },
          isSuspicious: alert.isSuspicious,
          alertLevel: analysis?.alertLevel ?? this.deriveAlertLevel(alert.fraudScore, alert.duplicateScore),
          duplicateComplaintId: alert.duplicateComplaintId,
          signals: analysis?.signals ?? [],
          reasons: analysis?.reasons ?? [],
          explanation: analysis?.explanation ?? null,
          citizen: alert.citizen,
          department: alert.department,
          assignedEmployee: alert.assignedEmployee,
          createdAt: alert.createdAt
        };
      })
      .filter((alert) =>
        filters?.reasonCode
          ? alert.reasons.some((reason) => reason.code === filters.reasonCode)
          : true
      );
  }

  async getSummary(filters?: { departmentId?: string }) {
    const [summary, alerts] = await Promise.all([
      this.fraudRepository.getSummary(filters),
      this.listAlerts({
        departmentId: filters?.departmentId,
        limit: 100,
        minScore: 0
      })
    ]);

    const reasonCounts = new Map<string, number>();
    alerts.forEach((alert) => {
      alert.reasons.forEach((reason) => {
        reasonCounts.set(reason.code, (reasonCounts.get(reason.code) ?? 0) + 1);
      });
    });

    return {
      ...summary,
      highSeverityAlerts: alerts.filter((alert) => alert.alertLevel === "HIGH").length,
      reasonBreakdown: [...reasonCounts.entries()]
        .map(([code, count]) => ({ code, count }))
        .sort((first, second) => second.count - first.count)
    };
  }

  private deriveAlertLevel(fraudScore?: number | null, duplicateScore?: number | null): AlertLevel {
    if (
      (fraudScore ?? 0) >= FRAUD_CONFIG.highAlertThreshold ||
      (duplicateScore ?? 0) >= FRAUD_CONFIG.highAlertThreshold
    ) {
      return "HIGH";
    }

    if (
      (fraudScore ?? 0) >= FRAUD_CONFIG.fraudAlertThreshold ||
      (duplicateScore ?? 0) >= FRAUD_CONFIG.duplicateThreshold
    ) {
      return "MEDIUM";
    }

    return "LOW";
  }

  private normalizeFraudAnalysis(value: unknown) {
    if (Array.isArray(value)) {
      return {
        alertLevel: undefined,
        signals: value.filter((item): item is string => typeof item === "string"),
        reasons: [],
        explanation: null
      };
    }

    if (!value || typeof value !== "object") {
      return null;
    }

    const record = value as {
      alertLevel?: AlertLevel;
      signals?: string[];
      reasons?: FraudReason[];
      explanation?: Record<string, unknown>;
    };

    return {
      alertLevel: record.alertLevel,
      signals: Array.isArray(record.signals) ? record.signals : [],
      reasons: Array.isArray(record.reasons) ? record.reasons : [],
      explanation: record.explanation ?? null
    };
  }
}
