import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { sendSuccess } from "utils/api-response";

import { AnalyticsService } from "./analytics.service";

const analyticsService = new AnalyticsService();

export class AnalyticsController {
  async dashboard(req: Request, res: Response) {
    const data = await analyticsService.getDashboard(req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Dashboard analytics fetched",
      data
    });
  }

  async overview(req: Request, res: Response) {
    const data = await analyticsService.getOverview(req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Complaint overview analytics fetched",
      data
    });
  }

  async trends(req: Request, res: Response) {
    const data = await analyticsService.getTrends(req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Complaint trends fetched",
      data
    });
  }

  async categories(req: Request, res: Response) {
    const data = await analyticsService.getCategoryBreakdown(req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Complaint category analytics fetched",
      data
    });
  }

  async departments(req: Request, res: Response) {
    const data = await analyticsService.getDepartmentStats(req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Department analytics fetched",
      data
    });
  }

  async departmentScores(req: Request, res: Response) {
    const data = await analyticsService.getDepartmentScores(req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Department score analytics fetched",
      data
    });
  }

  async officers(req: Request, res: Response) {
    const data = await analyticsService.getOfficerStats(req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Officer performance analytics fetched",
      data
    });
  }

  async ratings(req: Request, res: Response) {
    const data = await analyticsService.getRatingsSummary(req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Citizen satisfaction analytics fetched",
      data
    });
  }

  async leaderboard(req: Request, res: Response) {
    const data = await analyticsService.getDepartmentLeaderboard(req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Department leaderboard analytics fetched",
      data
    });
  }

  async hotspots(req: Request, res: Response) {
    const data = await analyticsService.getHotspots(req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Complaint hotspots fetched",
      data
    });
  }

  async geo(req: Request, res: Response) {
    const data = await analyticsService.getGeoInsights(req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Geo analytics fetched",
      data
    });
  }

  async cityHealth(req: Request, res: Response) {
    const data = await analyticsService.getCityHealth(req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "City health score fetched",
      data
    });
  }

  async publicSummary(req: Request, res: Response) {
    const data = await analyticsService.getPublicSummary(req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Public city summary fetched",
      data
    });
  }

  async publicTrends(req: Request, res: Response) {
    const data = await analyticsService.getPublicTrends(req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Public complaint trends fetched",
      data
    });
  }

  async publicDepartments(req: Request, res: Response) {
    const data = await analyticsService.getPublicDepartmentPerformance(req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Public department performance fetched",
      data
    });
  }

  async publicResolutionTimes(req: Request, res: Response) {
    const data = await analyticsService.getPublicResolutionTimes(req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Public department resolution times fetched",
      data
    });
  }

  async publicLeaderboard(req: Request, res: Response) {
    const data = await analyticsService.getPublicLeaderboard(req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Public leaderboard fetched",
      data
    });
  }

  async publicAreas(req: Request, res: Response) {
    const data = await analyticsService.getPublicAreaCounts(req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Public area complaint counts fetched",
      data
    });
  }

  async publicTransparency(req: Request, res: Response) {
    const data = await analyticsService.getPublicTransparency(req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Public transparency analytics fetched",
      data
    });
  }

  async publicHotspots(req: Request, res: Response) {
    const data = await analyticsService.getPublicHotspots(req.query);

    return sendSuccess(res, StatusCodes.OK, {
      message: "Public complaint hotspots fetched",
      data
    });
  }
}
