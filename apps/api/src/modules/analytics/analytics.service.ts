import { ComplaintStatus } from "@prisma/client";

import { PENDING_COMPLAINT_STATUSES } from "constants/complaint-workflow";
import { SCORING_CONFIG } from "constants/scoring";
import { buildAreaKey } from "utils/geo";

import type { AnalyticsQuery } from "./analytics.validator";
import { AnalyticsRepository } from "./analytics.repository";
import { ScoringService, type ScoreBreakdown } from "./scoring.service";

type ComplaintRecord = Awaited<ReturnType<AnalyticsRepository["listComplaints"]>>[number];
type DepartmentRecord = Awaited<ReturnType<AnalyticsRepository["listDepartments"]>>[number];

type NormalizedAnalyticsQuery = {
  from?: string;
  to?: string;
  interval: "day" | "week" | "month";
  category?: string;
  departmentId?: string;
  geoView: "area" | "grid" | "zone";
  precision: number;
  minCount: number;
  minLatitude?: number;
  maxLatitude?: number;
  minLongitude?: number;
  maxLongitude?: number;
  limit: number;
  page: number;
  pageSize: number;
};

type StatusCounts = {
  totalComplaints: number;
  submittedCount: number;
  underReviewCount: number;
  assignedCount: number;
  openCount: number;
  inProgressCount: number;
  resolvedCount: number;
  rejectedCount: number;
  reopenedCount: number;
  closedCount: number;
  pendingCount: number;
};

type CategoryAnalyticsRecord = StatusCounts & {
  category: string;
  averageResolutionHours: number;
  resolutionRate: number;
};

type DepartmentAnalyticsRecord = StatusCounts & {
  departmentId: string;
  departmentName: string;
  averageResolutionHours: number;
  averageRating: number;
  resolutionRate: number;
  pendingRatio: number;
  backlogCount: number;
  performanceScore: number;
  scoreBreakdown: ScoreBreakdown;
};

type OfficerAnalyticsRecord = StatusCounts & {
  officerId: string;
  officerName: string;
  departmentId: string | null;
  totalAssigned: number;
  averageResolutionHours: number;
  averageRating: number;
  resolutionRate: number;
  pendingRatio: number;
  backlogCount: number;
  performanceScore: number;
};

type SatisfactionRecord = {
  averageRating: number;
  totalRatings: number;
  feedbackCoverage: number;
  distribution: Array<{ rating: number; count: number }>;
  departmentRatings: Array<{ departmentId: string; departmentName: string; averageRating: number }>;
  officerRatings: Array<{ officerId: string; officerName: string; averageRating: number }>;
};

type HotspotRecord = {
  area: string;
  count: number;
  unresolvedCount: number;
  latitude: number | null;
  longitude: number | null;
  topCategory: string;
};

type HighRiskAreaRecord = {
  area: string;
  complaintCount: number;
  unresolvedCount: number;
  riskScore: number;
  topCategory: string;
};

type GeoAreaRecord = {
  area: string;
  geoView: NormalizedAnalyticsQuery["geoView"];
  complaintCount: number;
  unresolvedCount: number;
  resolvedCount: number;
  unresolvedRatio: number;
  riskScore: number;
  topCategory: string;
  categoryBreakdown: Array<{
    category: string;
    count: number;
    share: number;
  }>;
  centroid: {
    latitude: number | null;
    longitude: number | null;
  };
  hasCoordinates: boolean;
  riskBreakdown: {
    complaintFrequencyScore: number;
    unresolvedPressureScore: number;
    weights: typeof SCORING_CONFIG.geoRiskWeights;
  };
};

type GeoInsightsRecord = {
  aggregation: {
    geoView: NormalizedAnalyticsQuery["geoView"];
    precision: number;
    minCount: number;
  };
  summary: {
    totalAreas: number;
    mappedAreas: number;
    mappedComplaints: number;
    unresolvedComplaints: number;
    unmappedComplaints: number;
  };
  areaCounts: Array<{ area: string; count: number }>;
  areas: GeoAreaRecord[];
  topIssueZones: Array<{
    rank: number;
    area: string;
    complaintCount: number;
    unresolvedCount: number;
    topCategory: string;
  }>;
  hotspots: HotspotRecord[];
  highRiskAreas: HighRiskAreaRecord[];
  map: {
    heatmap: Array<{
      area: string;
      latitude: number;
      longitude: number;
      weight: number;
      riskScore: number;
      complaintCount: number;
      unresolvedCount: number;
    }>;
    markers: Array<{
      area: string;
      latitude: number;
      longitude: number;
      complaintCount: number;
      unresolvedCount: number;
      riskScore: number;
      topCategory: string;
    }>;
  };
};

type MetricsBundle = {
  filters: NormalizedAnalyticsQuery;
  overview: StatusCounts & { averageResolutionHours: number; resolutionRate: number };
  trends: Array<StatusCounts & { period: string }>;
  byCategory: CategoryAnalyticsRecord[];
  byDepartment: DepartmentAnalyticsRecord[];
  officerStats: {
    items: OfficerAnalyticsRecord[];
    pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
  };
  satisfaction: SatisfactionRecord;
  areaCounts: Array<{ area: string; count: number }>;
  hotspots: HotspotRecord[];
  highRiskAreas: HighRiskAreaRecord[];
  departmentLeaderboard: Array<{
    rank: number;
    departmentId: string;
    departmentName: string;
    score: number;
    resolvedCount: number;
    resolutionRate: number;
    averageRating: number;
  }>;
  cityHealth: {
    cityScore: number;
    breakdown: ScoreBreakdown;
    metrics: {
      resolutionRate: number;
      pendingRatio: number;
      averageResolutionHours: number;
      citizenSatisfaction: number;
      backlogCount: number;
    };
    scoring: {
      targetResolutionHours: number;
      backlogReferenceCount: number;
      weights: typeof SCORING_CONFIG.cityHealthWeights;
    };
    departmentScores: Array<{
      departmentId: string;
      departmentName: string;
      score: number;
      pendingRatio: number;
      backlogCount: number;
      breakdown: ScoreBreakdown;
      metrics: {
        resolutionRate: number;
        pendingRatio: number;
        averageResolutionHours: number;
        citizenSatisfaction: number;
        backlogCount: number;
      };
    }>;
  };
};

export class AnalyticsService {
  constructor(
    private readonly analyticsRepository: AnalyticsRepository = new AnalyticsRepository(),
    private readonly scoringService: ScoringService = new ScoringService()
  ) {}

  async getDashboard(query: AnalyticsQuery) {
    const metrics = await this.buildMetrics(query);
    return {
      filters: metrics.filters,
      overview: metrics.overview,
      trends: metrics.trends,
      byCategory: metrics.byCategory,
      byDepartment: metrics.byDepartment,
      officerStats: metrics.officerStats.items,
      officerPagination: metrics.officerStats.pagination,
      satisfaction: metrics.satisfaction,
      hotspots: metrics.hotspots,
      highRiskAreas: metrics.highRiskAreas,
      departmentLeaderboard: metrics.departmentLeaderboard,
      cityHealth: metrics.cityHealth
    };
  }

  async getOverview(query: AnalyticsQuery) {
    const metrics = await this.buildMetrics(query);
    return { filters: metrics.filters, overview: metrics.overview };
  }

  async getTrends(query: AnalyticsQuery) {
    const metrics = await this.buildMetrics(query);
    return { filters: metrics.filters, interval: metrics.filters.interval, trends: metrics.trends };
  }

  async getCategoryBreakdown(query: AnalyticsQuery) {
    const metrics = await this.buildMetrics(query);
    return { filters: metrics.filters, categories: metrics.byCategory };
  }

  async getDepartmentStats(query: AnalyticsQuery) {
    const metrics = await this.buildMetrics(query);
    return { filters: metrics.filters, departments: metrics.byDepartment };
  }

  async getDepartmentScores(query: AnalyticsQuery) {
    const metrics = await this.buildMetrics(query);
    return {
      filters: metrics.filters,
      scoring: {
        targetResolutionHours: SCORING_CONFIG.targetResolutionHours,
        backlogReferenceCount: SCORING_CONFIG.backlogReferenceCount,
        weights: SCORING_CONFIG.departmentWeights
      },
      departments: metrics.cityHealth.departmentScores
    };
  }

  async getOfficerStats(query: AnalyticsQuery) {
    const metrics = await this.buildMetrics(query);
    return {
      filters: metrics.filters,
      officers: metrics.officerStats.items,
      pagination: metrics.officerStats.pagination
    };
  }

  async getDepartmentLeaderboard(query: AnalyticsQuery) {
    const metrics = await this.buildMetrics(query);
    return { filters: metrics.filters, leaderboard: metrics.departmentLeaderboard };
  }

  async getRatingsSummary(query: AnalyticsQuery) {
    const metrics = await this.buildMetrics(query);
    return { filters: metrics.filters, satisfaction: metrics.satisfaction };
  }

  async getHotspots(query: AnalyticsQuery) {
    const filters = this.normalizeQuery(query);
    const complaints = await this.analyticsRepository.listComplaints(this.buildWhere(filters));
    const geo = this.buildGeoInsightsFromComplaints(complaints, filters);

    return {
      filters,
      aggregation: geo.aggregation,
      summary: geo.summary,
      areaCounts: geo.areaCounts,
      hotspots: geo.hotspots,
      highRiskAreas: geo.highRiskAreas,
      topIssueZones: geo.topIssueZones,
      map: geo.map
    };
  }

  async getGeoInsights(query: AnalyticsQuery) {
    const filters = this.normalizeQuery(query);
    const complaints = await this.analyticsRepository.listComplaints(this.buildWhere(filters));
    const geo = this.buildGeoInsightsFromComplaints(complaints, filters);

    return {
      filters,
      aggregation: geo.aggregation,
      summary: geo.summary,
      areaCounts: geo.areaCounts,
      areas: geo.areas,
      topIssueZones: geo.topIssueZones,
      hotspots: geo.hotspots,
      highRiskAreas: geo.highRiskAreas,
      map: geo.map
    };
  }

  async getCityHealth(query: AnalyticsQuery) {
    const metrics = await this.buildMetrics(query);
    return {
      filters: metrics.filters,
      scoring: metrics.cityHealth.scoring,
      cityHealth: metrics.cityHealth
    };
  }

  async getPublicSummary(query: AnalyticsQuery) {
    const metrics = await this.buildMetrics(query);
    return {
      filters: metrics.filters,
      cards: this.buildPublicSummaryCards(metrics),
      citySummary: this.buildPublicCitySummary(metrics)
    };
  }

  async getPublicTrends(query: AnalyticsQuery) {
    const metrics = await this.buildMetrics(query);
    return {
      filters: metrics.filters,
      chart: {
        interval: metrics.filters.interval,
        series: metrics.trends.map((trend) => ({
          period: trend.period,
          totalComplaints: trend.totalComplaints,
          openCount: trend.openCount,
          inProgressCount: trend.inProgressCount,
          resolvedCount: trend.resolvedCount,
          rejectedCount: trend.rejectedCount,
          reopenedCount: trend.reopenedCount
        }))
      }
    };
  }

  async getPublicDepartmentPerformance(query: AnalyticsQuery) {
    const metrics = await this.buildMetrics(query);
    const departments = this.toPublicDepartmentPerformance(metrics.byDepartment);
    return { filters: metrics.filters, table: { items: departments, totalItems: departments.length } };
  }

  async getPublicResolutionTimes(query: AnalyticsQuery) {
    const metrics = await this.buildMetrics(query);
    return {
      filters: metrics.filters,
      chart: {
        series: metrics.byDepartment.map((department) => ({
          departmentId: department.departmentId,
          departmentName: department.departmentName,
          averageResolutionHours: department.averageResolutionHours
        }))
      }
    };
  }

  async getPublicLeaderboard(query: AnalyticsQuery) {
    const metrics = await this.buildMetrics(query);
    return {
      filters: metrics.filters,
      table: {
        items: metrics.departmentLeaderboard,
        totalItems: metrics.departmentLeaderboard.length
      }
    };
  }

  async getPublicAreaCounts(query: AnalyticsQuery) {
    const filters = this.normalizeQuery(query);
    const complaints = await this.analyticsRepository.listComplaints(this.buildWhere(filters));
    const geo = this.buildGeoInsightsFromComplaints(complaints, filters);
    return { filters, aggregation: geo.aggregation, chart: { series: geo.areaCounts } };
  }

  async getPublicTransparency(query: AnalyticsQuery) {
    const metrics = await this.buildMetrics(query);
    const departmentPerformance = this.toPublicDepartmentPerformance(metrics.byDepartment);
    return {
      filters: metrics.filters,
      citySummary: this.buildPublicCitySummary(metrics),
      overview: metrics.overview,
      trends: metrics.trends.map(
        ({ period, totalComplaints, openCount, inProgressCount, resolvedCount, rejectedCount, reopenedCount }) => ({
          period,
          totalComplaints,
          openCount,
          inProgressCount,
          resolvedCount,
          rejectedCount,
          reopenedCount
        })
      ),
      complaintsByCategory: metrics.byCategory.map((category) => ({
        category: category.category,
        totalComplaints: category.totalComplaints,
        openCount: category.openCount,
        inProgressCount: category.inProgressCount,
        resolvedCount: category.resolvedCount,
        rejectedCount: category.rejectedCount,
        reopenedCount: category.reopenedCount,
        averageResolutionHours: category.averageResolutionHours
      })),
      departmentPerformance,
      publicLeaderboard: metrics.departmentLeaderboard,
      areaCounts: metrics.areaCounts,
      averageResolutionTimeByDepartment: metrics.byDepartment.map((department) => ({
        departmentId: department.departmentId,
        departmentName: department.departmentName,
        averageResolutionHours: department.averageResolutionHours
      })),
      cityHealth: {
        cityScore: metrics.cityHealth.cityScore,
        departmentScores: metrics.cityHealth.departmentScores.map((department) => ({
          departmentId: department.departmentId,
          departmentName: department.departmentName,
          score: department.score
        }))
      },
      cards: this.buildPublicSummaryCards(metrics),
      charts: {
        trends: {
          interval: metrics.filters.interval,
          series: metrics.trends.map((trend) => ({
            period: trend.period,
            totalComplaints: trend.totalComplaints,
            openCount: trend.openCount,
            inProgressCount: trend.inProgressCount,
            resolvedCount: trend.resolvedCount,
            rejectedCount: trend.rejectedCount,
            reopenedCount: trend.reopenedCount
          }))
        },
        complaintsByCategory: {
          series: metrics.byCategory.map((category) => ({
            category: category.category,
            totalComplaints: category.totalComplaints
          }))
        },
        areaCounts: { series: metrics.areaCounts },
        averageResolutionTimeByDepartment: {
          series: metrics.byDepartment.map((department) => ({
            departmentId: department.departmentId,
            departmentName: department.departmentName,
            averageResolutionHours: department.averageResolutionHours
          }))
        }
      },
      tables: {
        departmentPerformance: { items: departmentPerformance, totalItems: departmentPerformance.length },
        publicLeaderboard: {
          items: metrics.departmentLeaderboard,
          totalItems: metrics.departmentLeaderboard.length
        }
      },
      map: { hotspots: this.toPublicHotspots(metrics.hotspots) }
    };
  }

  async getPublicHotspots(query: AnalyticsQuery) {
    const filters = this.normalizeQuery(query);
    const complaints = await this.analyticsRepository.listComplaints(this.buildWhere(filters));
    const geo = this.buildGeoInsightsFromComplaints(complaints, filters);

    return {
      filters,
      aggregation: geo.aggregation,
      summary: geo.summary,
      topIssueZones: geo.topIssueZones,
      map: {
        hotspots: this.toPublicHotspots(geo.hotspots),
        heatmap: geo.map.heatmap
      }
    };
  }

  private async buildMetrics(query: AnalyticsQuery): Promise<MetricsBundle> {
    const filters = this.normalizeQuery(query);
    const departmentWhere = filters.departmentId ? { id: filters.departmentId } : undefined;
    const [complaints, departments] = await Promise.all([
      this.analyticsRepository.listComplaints(this.buildWhere(filters)),
      this.analyticsRepository.listDepartments(departmentWhere)
    ]);

    const overview = this.buildOverview(complaints);
    const byDepartment = this.groupByDepartment(complaints, departments);
    const officerStats = this.groupByOfficer(complaints, filters.page, filters.pageSize);
    const satisfaction = this.buildSatisfaction(complaints, byDepartment, officerStats.items);

    return {
      filters,
      overview,
      trends: this.buildTrends(complaints, filters.interval),
      byCategory: this.groupByCategory(complaints),
      byDepartment,
      officerStats,
      satisfaction,
      areaCounts: this.groupByArea(complaints, filters.limit),
      hotspots: this.buildHotspots(complaints, filters.limit),
      highRiskAreas: this.buildHighRiskAreas(complaints, filters.limit),
      departmentLeaderboard: this.buildDepartmentLeaderboard(byDepartment, filters.limit),
      cityHealth: this.buildCityHealth(overview, byDepartment, satisfaction.averageRating)
    };
  }

  private normalizeQuery(query: AnalyticsQuery): NormalizedAnalyticsQuery {
    return {
      from: query.from,
      to: query.to,
      interval: query.interval ?? "day",
      category: query.category,
      departmentId: query.departmentId,
      geoView: query.geoView ?? "area",
      precision: query.precision ?? SCORING_CONFIG.hotspotGridPrecision,
      minCount: query.minCount ?? 1,
      minLatitude: query.minLatitude,
      maxLatitude: query.maxLatitude,
      minLongitude: query.minLongitude,
      maxLongitude: query.maxLongitude,
      limit: query.limit ?? 10,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20
    };
  }

  private buildWhere(filters: NormalizedAnalyticsQuery) {
    const andConditions: Array<Record<string, unknown>> = [];
    if (filters.from || filters.to) {
      andConditions.push({
        createdAt: {
          ...(filters.from ? { gte: new Date(filters.from) } : {}),
          ...(filters.to ? { lte: new Date(filters.to) } : {})
        }
      });
    }
    if (filters.departmentId) {
      andConditions.push({ departmentId: filters.departmentId });
    }
    if (filters.category) {
      andConditions.push({
        OR: [
          { category: { equals: filters.category, mode: "insensitive" } },
          { aiCategory: { equals: filters.category, mode: "insensitive" } }
        ]
      });
    }
    if (filters.minLatitude != null && filters.maxLatitude != null) {
      andConditions.push({
        latitude: {
          gte: filters.minLatitude,
          lte: filters.maxLatitude
        }
      });
    }
    if (filters.minLongitude != null && filters.maxLongitude != null) {
      andConditions.push({
        longitude: {
          gte: filters.minLongitude,
          lte: filters.maxLongitude
        }
      });
    }
    return andConditions.length > 0 ? { AND: andConditions } : {};
  }

  private buildOverview(complaints: ComplaintRecord[]) {
    const counts = this.buildStatusCounts(complaints);
    return {
      ...counts,
      averageResolutionHours: this.calculateAverageResolutionHours(complaints),
      resolutionRate: this.percentage(counts.resolvedCount + counts.closedCount, counts.totalComplaints)
    };
  }

  private buildTrends(complaints: ComplaintRecord[], interval: NormalizedAnalyticsQuery["interval"]) {
    const trendMap = new Map<string, ComplaintRecord[]>();
    complaints.forEach((complaint) => {
      const period = this.formatInterval(complaint.createdAt, interval);
      const existing = trendMap.get(period) ?? [];
      existing.push(complaint);
      trendMap.set(period, existing);
    });

    return [...trendMap.entries()]
      .map(([period, periodComplaints]) => ({ period, ...this.buildStatusCounts(periodComplaints) }))
      .sort((first, second) => first.period.localeCompare(second.period));
  }

  private groupByCategory(complaints: ComplaintRecord[]): CategoryAnalyticsRecord[] {
    const categoryMap = new Map<string, ComplaintRecord[]>();
    complaints.forEach((complaint) => {
      const category = complaint.category ?? complaint.aiCategory ?? "Uncategorized";
      const existing = categoryMap.get(category) ?? [];
      existing.push(complaint);
      categoryMap.set(category, existing);
    });

    return [...categoryMap.entries()]
      .map(([category, categoryComplaints]) => {
        const counts = this.buildStatusCounts(categoryComplaints);
        return {
          category,
          ...counts,
          averageResolutionHours: this.calculateAverageResolutionHours(categoryComplaints),
          resolutionRate: this.percentage(
            counts.resolvedCount + counts.closedCount,
            counts.totalComplaints
          )
        };
      })
      .sort((first, second) => second.totalComplaints - first.totalComplaints);
  }

  private groupByDepartment(
    complaints: ComplaintRecord[],
    departments: DepartmentRecord[]
  ): DepartmentAnalyticsRecord[] {
    return departments
      .map((department) => {
        const departmentComplaints = complaints.filter((complaint) => complaint.departmentId === department.id);
        const counts = this.buildStatusCounts(departmentComplaints);
        const ratings = departmentComplaints
          .map((complaint) => complaint.feedback?.rating)
          .filter((rating): rating is number => typeof rating === "number");
        const averageRating = ratings.length
          ? Number((ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(2))
          : 0;
        const averageResolutionHours = this.calculateAverageResolutionHours(departmentComplaints);
        const resolutionRate = this.percentage(
          counts.resolvedCount + counts.closedCount,
          counts.totalComplaints
        );
        const pendingRatio = this.percentage(counts.pendingCount, counts.totalComplaints);
        const backlogCount = counts.pendingCount;
        const scoreResult = this.scoringService.calculateDepartmentPerformanceScore({
          resolutionRate,
          pendingRatio,
          averageResolutionHours,
          citizenSatisfaction: averageRating,
          backlogCount
        });

        return {
          departmentId: department.id,
          departmentName: department.name,
          ...counts,
          averageResolutionHours,
          averageRating,
          resolutionRate,
          pendingRatio,
          backlogCount,
          performanceScore: scoreResult.score,
          scoreBreakdown: scoreResult.breakdown
        };
      })
      .sort((first, second) => second.totalComplaints - first.totalComplaints);
  }

  private groupByOfficer(complaints: ComplaintRecord[], page: number, pageSize: number) {
    const officerMap = new Map<string, ComplaintRecord[]>();
    complaints.forEach((complaint) => {
      if (!complaint.assignedEmployee) {
        return;
      }
      const existing = officerMap.get(complaint.assignedEmployee.id) ?? [];
      existing.push(complaint);
      officerMap.set(complaint.assignedEmployee.id, existing);
    });

    const allOfficers = [...officerMap.entries()]
      .map(([officerId, officerComplaints]) => {
        const officer = officerComplaints[0]?.assignedEmployee;
        const counts = this.buildStatusCounts(officerComplaints);
        const ratings = officerComplaints
          .map((complaint) => complaint.feedback?.rating)
          .filter((rating): rating is number => typeof rating === "number");
        const averageRating = ratings.length
          ? Number((ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(2))
          : 0;
        const averageResolutionHours = this.calculateAverageResolutionHours(officerComplaints);
        const resolutionRate = this.percentage(
          counts.resolvedCount + counts.closedCount,
          counts.totalComplaints
        );
        const pendingRatio = this.percentage(counts.pendingCount, counts.totalComplaints);
        const backlogCount = counts.pendingCount;

        return {
          officerId,
          officerName: officer?.fullName ?? "Unknown Officer",
          departmentId: officer?.departmentId ?? null,
          totalAssigned: officerComplaints.length,
          ...counts,
          averageResolutionHours,
          averageRating,
          resolutionRate,
          pendingRatio,
          backlogCount,
          performanceScore: this.scoringService.calculateDepartmentPerformanceScore({
            resolutionRate,
            pendingRatio,
            averageResolutionHours,
            citizenSatisfaction: averageRating,
            backlogCount
          }).score
        };
      })
      .sort((first, second) => second.performanceScore - first.performanceScore);

    const totalItems = allOfficers.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const startIndex = (page - 1) * pageSize;

    return {
      items: allOfficers.slice(startIndex, startIndex + pageSize),
      pagination: { page, pageSize, totalItems, totalPages }
    };
  }

  private buildSatisfaction(
    complaints: ComplaintRecord[],
    departments: DepartmentAnalyticsRecord[],
    officers: OfficerAnalyticsRecord[]
  ): SatisfactionRecord {
    const ratings = complaints
      .map((complaint) => complaint.feedback?.rating)
      .filter((rating): rating is number => typeof rating === "number");
    const resolvedComplaintsCount = complaints.filter(
      (complaint) =>
        complaint.status === ComplaintStatus.RESOLVED || complaint.status === ComplaintStatus.CLOSED
    ).length;

    return {
      averageRating: ratings.length
        ? Number((ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(2))
        : 0,
      totalRatings: ratings.length,
      feedbackCoverage: this.percentage(ratings.length, resolvedComplaintsCount),
      distribution: [1, 2, 3, 4, 5].map((rating) => ({
        rating,
        count: ratings.filter((value) => value === rating).length
      })),
      departmentRatings: departments
        .filter((department) => department.averageRating > 0)
        .map((department) => ({
          departmentId: department.departmentId,
          departmentName: department.departmentName,
          averageRating: department.averageRating
        }))
        .sort((first, second) => second.averageRating - first.averageRating),
      officerRatings: officers
        .filter((officer) => officer.averageRating > 0)
        .map((officer) => ({
          officerId: officer.officerId,
          officerName: officer.officerName,
          averageRating: officer.averageRating
        }))
        .sort((first, second) => second.averageRating - first.averageRating)
    };
  }

  private buildGeoInsightsFromComplaints(
    complaints: ComplaintRecord[],
    filters: NormalizedAnalyticsQuery
  ): GeoInsightsRecord {
    const geoMap = new Map<
      string,
      {
        area: string;
        complaintCount: number;
        unresolvedCount: number;
        resolvedCount: number;
        latitudeTotal: number;
        longitudeTotal: number;
        withCoordinates: number;
        categoryCounts: Map<string, number>;
      }
    >();
    let unmappedComplaints = 0;

    complaints.forEach((complaint) => {
      const latitude = complaint.latitude != null ? Number(complaint.latitude) : undefined;
      const longitude = complaint.longitude != null ? Number(complaint.longitude) : undefined;
      const area = this.buildGeoBucketKey(
        complaint.locationAddress,
        latitude,
        longitude,
        filters.geoView,
        filters.precision
      );

      if (area === "Unknown") {
        unmappedComplaints += 1;
        return;
      }

      const existing = geoMap.get(area) ?? {
        area,
        complaintCount: 0,
        unresolvedCount: 0,
        resolvedCount: 0,
        latitudeTotal: 0,
        longitudeTotal: 0,
        withCoordinates: 0,
        categoryCounts: new Map<string, number>()
      };

      existing.complaintCount += 1;
      if (PENDING_COMPLAINT_STATUSES.includes(complaint.status)) {
        existing.unresolvedCount += 1;
      }
      if (
        complaint.status === ComplaintStatus.RESOLVED ||
        complaint.status === ComplaintStatus.CLOSED
      ) {
        existing.resolvedCount += 1;
      }
      if (latitude != null && longitude != null) {
        existing.latitudeTotal += latitude;
        existing.longitudeTotal += longitude;
        existing.withCoordinates += 1;
      }

      const category = complaint.category ?? complaint.aiCategory ?? "Uncategorized";
      existing.categoryCounts.set(category, (existing.categoryCounts.get(category) ?? 0) + 1);
      geoMap.set(area, existing);
    });

    const areas = [...geoMap.values()]
      .map((item) => {
        const categoryBreakdown = [...item.categoryCounts.entries()]
          .sort((first, second) => second[1] - first[1])
          .map(([category, count]) => ({
            category,
            count,
            share: this.percentage(count, item.complaintCount)
          }));
        const complaintFrequencyScore = Math.min(
          100,
          Number(((item.complaintCount / SCORING_CONFIG.geoRiskReferenceCount) * 100).toFixed(2))
        );
        const unresolvedPressureScore = Math.min(
          100,
          Number(((item.unresolvedCount / SCORING_CONFIG.geoRiskReferenceCount) * 100).toFixed(2))
        );
        const riskScore = Number(
          (
            complaintFrequencyScore * SCORING_CONFIG.geoRiskWeights.complaintFrequency +
            unresolvedPressureScore * SCORING_CONFIG.geoRiskWeights.unresolvedPressure
          ).toFixed(2)
        );

        return {
          area: item.area,
          geoView: filters.geoView,
          complaintCount: item.complaintCount,
          unresolvedCount: item.unresolvedCount,
          resolvedCount: item.resolvedCount,
          unresolvedRatio: this.percentage(item.unresolvedCount, item.complaintCount),
          riskScore,
          topCategory: categoryBreakdown[0]?.category ?? "Uncategorized",
          categoryBreakdown,
          centroid: {
            latitude:
              item.withCoordinates > 0
                ? Number((item.latitudeTotal / item.withCoordinates).toFixed(5))
                : null,
            longitude:
              item.withCoordinates > 0
                ? Number((item.longitudeTotal / item.withCoordinates).toFixed(5))
                : null
          },
          hasCoordinates: item.withCoordinates > 0,
          riskBreakdown: {
            complaintFrequencyScore,
            unresolvedPressureScore,
            weights: SCORING_CONFIG.geoRiskWeights
          }
        };
      })
      .filter((item) => item.complaintCount >= filters.minCount);

    const sortedByCount = [...areas].sort((first, second) => {
      if (second.complaintCount !== first.complaintCount) {
        return second.complaintCount - first.complaintCount;
      }

      return second.unresolvedCount - first.unresolvedCount;
    });
    const sortedByRisk = [...areas].sort((first, second) => second.riskScore - first.riskScore);
    const mapAreas = areas.filter(
      (item): item is GeoAreaRecord & { centroid: { latitude: number; longitude: number } } =>
        item.centroid.latitude != null && item.centroid.longitude != null
    );
    const hotspots = sortedByCount.slice(0, filters.limit).map((item) => ({
      area: item.area,
      count: item.complaintCount,
      unresolvedCount: item.unresolvedCount,
      latitude: item.centroid.latitude,
      longitude: item.centroid.longitude,
      topCategory: item.topCategory
    }));
    const highRiskAreas = sortedByRisk.slice(0, filters.limit).map((item) => ({
      area: item.area,
      complaintCount: item.complaintCount,
      unresolvedCount: item.unresolvedCount,
      riskScore: item.riskScore,
      topCategory: item.topCategory
    }));

    return {
      aggregation: {
        geoView: filters.geoView,
        precision: filters.precision,
        minCount: filters.minCount
      },
      summary: {
        totalAreas: areas.length,
        mappedAreas: mapAreas.length,
        mappedComplaints: mapAreas.reduce((sum, item) => sum + item.complaintCount, 0),
        unresolvedComplaints: areas.reduce((sum, item) => sum + item.unresolvedCount, 0),
        unmappedComplaints
      },
      areaCounts: sortedByCount.slice(0, filters.limit).map((item) => ({
        area: item.area,
        count: item.complaintCount
      })),
      areas: sortedByCount,
      topIssueZones: sortedByCount.slice(0, filters.limit).map((item, index) => ({
        rank: index + 1,
        area: item.area,
        complaintCount: item.complaintCount,
        unresolvedCount: item.unresolvedCount,
        topCategory: item.topCategory
      })),
      hotspots,
      highRiskAreas,
      map: {
        heatmap: mapAreas.map((item) => ({
          area: item.area,
          latitude: item.centroid.latitude,
          longitude: item.centroid.longitude,
          weight: item.complaintCount,
          riskScore: item.riskScore,
          complaintCount: item.complaintCount,
          unresolvedCount: item.unresolvedCount
        })),
        markers: hotspots
          .filter(
            (item): item is HotspotRecord & { latitude: number; longitude: number } =>
              item.latitude != null && item.longitude != null
          )
          .map((item) => ({
            area: item.area,
            latitude: item.latitude,
            longitude: item.longitude,
            complaintCount: item.count,
            unresolvedCount: item.unresolvedCount,
            riskScore:
              highRiskAreas.find((riskItem) => riskItem.area === item.area)?.riskScore ?? item.count,
            topCategory: item.topCategory
          }))
      }
    };
  }

  private buildGeoBucketKey(
    locationAddress: string | null | undefined,
    latitude: number | undefined,
    longitude: number | undefined,
    geoView: NormalizedAnalyticsQuery["geoView"],
    precision: number
  ) {
    if (geoView === "grid") {
      if (latitude != null && longitude != null) {
        return `${latitude.toFixed(precision)},${longitude.toFixed(precision)}`;
      }

      return buildAreaKey(locationAddress, latitude, longitude, precision);
    }

    if (geoView === "zone") {
      if (locationAddress?.trim()) {
        const parts = locationAddress
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean);

        if (parts.length > 0) {
          return parts[0];
        }
      }

      if (latitude != null && longitude != null) {
        const zonePrecision = Math.max(0, precision - 1);
        return `${latitude.toFixed(zonePrecision)},${longitude.toFixed(zonePrecision)}`;
      }

      return "Unknown";
    }

    return buildAreaKey(locationAddress, latitude, longitude, precision);
  }

  private groupByArea(complaints: ComplaintRecord[], limit: number) {
    const areaMap = new Map<string, number>();
    complaints.forEach((complaint) => {
      const area = buildAreaKey(
        complaint.locationAddress,
        complaint.latitude != null ? Number(complaint.latitude) : undefined,
        complaint.longitude != null ? Number(complaint.longitude) : undefined
      );
      areaMap.set(area, (areaMap.get(area) ?? 0) + 1);
    });

    return [...areaMap.entries()]
      .map(([area, count]) => ({ area, count }))
      .sort((first, second) => second.count - first.count)
      .slice(0, limit);
  }

  private buildHotspots(complaints: ComplaintRecord[], limit: number): HotspotRecord[] {
    const hotspotMap = new Map<
      string,
      {
        area: string;
        count: number;
        unresolvedCount: number;
        latitudeTotal: number;
        longitudeTotal: number;
        withCoordinates: number;
        categoryCounts: Map<string, number>;
      }
    >();

    complaints.forEach((complaint) => {
      const latitude = complaint.latitude != null ? Number(complaint.latitude) : undefined;
      const longitude = complaint.longitude != null ? Number(complaint.longitude) : undefined;
      const area = buildAreaKey(
        complaint.locationAddress,
        latitude,
        longitude,
        SCORING_CONFIG.hotspotGridPrecision
      );
      const existing = hotspotMap.get(area) ?? {
        area,
        count: 0,
        unresolvedCount: 0,
        latitudeTotal: 0,
        longitudeTotal: 0,
        withCoordinates: 0,
        categoryCounts: new Map<string, number>()
      };

      existing.count += 1;
      existing.unresolvedCount += PENDING_COMPLAINT_STATUSES.includes(complaint.status) ? 1 : 0;
      if (latitude != null && longitude != null) {
        existing.latitudeTotal += latitude;
        existing.longitudeTotal += longitude;
        existing.withCoordinates += 1;
      }
      const category = complaint.category ?? complaint.aiCategory ?? "Uncategorized";
      existing.categoryCounts.set(category, (existing.categoryCounts.get(category) ?? 0) + 1);
      hotspotMap.set(area, existing);
    });

    return [...hotspotMap.values()]
      .map((hotspot) => ({
        area: hotspot.area,
        count: hotspot.count,
        unresolvedCount: hotspot.unresolvedCount,
        latitude:
          hotspot.withCoordinates > 0
            ? Number((hotspot.latitudeTotal / hotspot.withCoordinates).toFixed(5))
            : null,
        longitude:
          hotspot.withCoordinates > 0
            ? Number((hotspot.longitudeTotal / hotspot.withCoordinates).toFixed(5))
            : null,
        topCategory: this.pickTopCategory(hotspot.categoryCounts)
      }))
      .sort((first, second) =>
        second.count !== first.count
          ? second.count - first.count
          : second.unresolvedCount - first.unresolvedCount
      )
      .slice(0, limit);
  }

  private buildHighRiskAreas(complaints: ComplaintRecord[], limit: number): HighRiskAreaRecord[] {
    const riskMap = new Map<
      string,
      {
        area: string;
        complaintCount: number;
        unresolvedCount: number;
        categoryCounts: Map<string, number>;
      }
    >();

    complaints.forEach((complaint) => {
      const area = buildAreaKey(
        complaint.locationAddress,
        complaint.latitude != null ? Number(complaint.latitude) : undefined,
        complaint.longitude != null ? Number(complaint.longitude) : undefined
      );
      const existing = riskMap.get(area) ?? {
        area,
        complaintCount: 0,
        unresolvedCount: 0,
        categoryCounts: new Map<string, number>()
      };
      existing.complaintCount += 1;
      existing.unresolvedCount += PENDING_COMPLAINT_STATUSES.includes(complaint.status) ? 1 : 0;
      const category = complaint.category ?? complaint.aiCategory ?? "Uncategorized";
      existing.categoryCounts.set(category, (existing.categoryCounts.get(category) ?? 0) + 1);
      riskMap.set(area, existing);
    });

    return [...riskMap.values()]
      .map((item) => ({
        area: item.area,
        complaintCount: item.complaintCount,
        unresolvedCount: item.unresolvedCount,
        riskScore: Number(
          (
            Math.min(100, (item.complaintCount / SCORING_CONFIG.geoRiskReferenceCount) * 100) *
              SCORING_CONFIG.geoRiskWeights.complaintFrequency +
            Math.min(100, (item.unresolvedCount / SCORING_CONFIG.geoRiskReferenceCount) * 100) *
              SCORING_CONFIG.geoRiskWeights.unresolvedPressure
          ).toFixed(2)
        ),
        topCategory: this.pickTopCategory(item.categoryCounts)
      }))
      .sort((first, second) => second.riskScore - first.riskScore)
      .slice(0, limit);
  }

  private buildDepartmentLeaderboard(departments: DepartmentAnalyticsRecord[], limit: number) {
    return departments
      .filter((department) => department.totalComplaints > 0)
      .sort((first, second) =>
        second.performanceScore !== first.performanceScore
          ? second.performanceScore - first.performanceScore
          : second.resolutionRate - first.resolutionRate
      )
      .slice(0, limit)
      .map((department, index) => ({
        rank: index + 1,
        departmentId: department.departmentId,
        departmentName: department.departmentName,
        score: department.performanceScore,
        resolvedCount: department.resolvedCount + department.closedCount,
        resolutionRate: department.resolutionRate,
        averageRating: department.averageRating
      }));
  }

  private buildCityHealth(
    overview: MetricsBundle["overview"],
    departments: DepartmentAnalyticsRecord[],
    averageRating: number
  ): MetricsBundle["cityHealth"] {
    const metrics = {
      resolutionRate: overview.resolutionRate,
      pendingRatio: this.percentage(overview.pendingCount, overview.totalComplaints),
      averageResolutionHours: overview.averageResolutionHours,
      citizenSatisfaction: averageRating,
      backlogCount: overview.pendingCount
    };
    const scoreResult = this.scoringService.calculateCityHealthScore(metrics);

    return {
      cityScore: scoreResult.score,
      breakdown: scoreResult.breakdown,
      metrics,
      scoring: {
        targetResolutionHours: SCORING_CONFIG.targetResolutionHours,
        backlogReferenceCount: SCORING_CONFIG.backlogReferenceCount,
        weights: SCORING_CONFIG.cityHealthWeights
      },
      departmentScores: departments
        .filter((department) => department.totalComplaints > 0)
        .map((department) => ({
          departmentId: department.departmentId,
          departmentName: department.departmentName,
          score: department.performanceScore,
          pendingRatio: department.pendingRatio,
          backlogCount: department.backlogCount,
          breakdown: department.scoreBreakdown,
          metrics: {
            resolutionRate: department.resolutionRate,
            pendingRatio: department.pendingRatio,
            averageResolutionHours: department.averageResolutionHours,
            citizenSatisfaction: department.averageRating,
            backlogCount: department.backlogCount
          }
        }))
        .sort((first, second) => second.score - first.score)
    };
  }

  private buildStatusCounts(complaints: ComplaintRecord[]): StatusCounts {
    const counts: StatusCounts = {
      totalComplaints: complaints.length,
      submittedCount: 0,
      underReviewCount: 0,
      assignedCount: 0,
      openCount: 0,
      inProgressCount: 0,
      resolvedCount: 0,
      rejectedCount: 0,
      reopenedCount: 0,
      closedCount: 0,
      pendingCount: 0
    };

    complaints.forEach((complaint) => {
      switch (complaint.status) {
        case ComplaintStatus.SUBMITTED:
          counts.submittedCount += 1;
          break;
        case ComplaintStatus.UNDER_REVIEW:
          counts.underReviewCount += 1;
          break;
        case ComplaintStatus.ASSIGNED:
          counts.assignedCount += 1;
          break;
        case ComplaintStatus.OPEN:
          counts.openCount += 1;
          break;
        case ComplaintStatus.IN_PROGRESS:
          counts.inProgressCount += 1;
          break;
        case ComplaintStatus.RESOLVED:
          counts.resolvedCount += 1;
          break;
        case ComplaintStatus.REJECTED:
          counts.rejectedCount += 1;
          break;
        case ComplaintStatus.REOPENED:
          counts.reopenedCount += 1;
          break;
        case ComplaintStatus.CLOSED:
          counts.closedCount += 1;
          break;
        default:
          break;
      }
    });

    counts.pendingCount = complaints.filter((complaint) =>
      PENDING_COMPLAINT_STATUSES.includes(complaint.status)
    ).length;

    return counts;
  }

  private getResolutionHours(complaint: ComplaintRecord) {
    const completedAt = complaint.resolvedAt ?? complaint.closedAt;
    if (!completedAt) {
      return null;
    }
    return (completedAt.getTime() - complaint.createdAt.getTime()) / (1000 * 60 * 60);
  }

  private calculateAverageResolutionHours(complaints: ComplaintRecord[]) {
    const resolutionHours = complaints
      .map((complaint) => this.getResolutionHours(complaint))
      .filter((value): value is number => typeof value === "number");
    if (resolutionHours.length === 0) {
      return 0;
    }
    return Number(
      (resolutionHours.reduce((sum, value) => sum + value, 0) / resolutionHours.length).toFixed(2)
    );
  }

  private percentage(value: number, total: number) {
    return total === 0 ? 0 : Number(((value / total) * 100).toFixed(2));
  }

  private formatInterval(date: Date, interval: NormalizedAnalyticsQuery["interval"]) {
    if (interval === "month") {
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    }
    if (interval === "week") {
      const current = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
      const day = current.getUTCDay() || 7;
      current.setUTCDate(current.getUTCDate() - day + 1);
      return current.toISOString().slice(0, 10);
    }
    return date.toISOString().slice(0, 10);
  }

  private pickTopCategory(categoryCounts: Map<string, number>) {
    return [...categoryCounts.entries()].sort((first, second) => second[1] - first[1])[0]?.[0] ?? "Uncategorized";
  }

  private toPublicDepartmentPerformance(departments: DepartmentAnalyticsRecord[]) {
    return departments.map((department) => ({
      departmentId: department.departmentId,
      departmentName: department.departmentName,
      totalComplaints: department.totalComplaints,
      openCount: department.openCount,
      inProgressCount: department.inProgressCount,
      resolvedCount: department.resolvedCount,
      rejectedCount: department.rejectedCount,
      reopenedCount: department.reopenedCount,
      averageResolutionHours: department.averageResolutionHours,
      resolutionRate: department.resolutionRate
    }));
  }

  private toPublicHotspots(hotspots: HotspotRecord[]) {
    return hotspots.map((hotspot) => ({
      area: hotspot.area,
      count: hotspot.count,
      latitude: hotspot.latitude,
      longitude: hotspot.longitude,
      topCategory: hotspot.topCategory
    }));
  }

  private buildPublicSummaryCards(metrics: MetricsBundle) {
    return {
      totalComplaints: metrics.overview.totalComplaints,
      openCount: metrics.overview.openCount,
      inProgressCount: metrics.overview.inProgressCount,
      resolvedCount: metrics.overview.resolvedCount,
      rejectedCount: metrics.overview.rejectedCount,
      reopenedCount: metrics.overview.reopenedCount,
      averageResolutionHours: metrics.overview.averageResolutionHours
    };
  }

  private buildPublicCitySummary(metrics: MetricsBundle) {
    return {
      totalComplaints: metrics.overview.totalComplaints,
      openCount: metrics.overview.openCount,
      inProgressCount: metrics.overview.inProgressCount,
      resolvedCount: metrics.overview.resolvedCount,
      rejectedCount: metrics.overview.rejectedCount,
      reopenedCount: metrics.overview.reopenedCount,
      averageResolutionHours: metrics.overview.averageResolutionHours,
      activeDepartments: metrics.byDepartment.filter((department) => department.totalComplaints > 0).length,
      cityScore: metrics.cityHealth.cityScore
    };
  }
}
