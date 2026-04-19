import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate } from "middlewares/auth.middleware";
import { authorize } from "middlewares/role.middleware";
import { validate } from "middlewares/validate-request";
import { asyncHandler } from "utils/async-handler";

import { AnalyticsController } from "./analytics.controller";
import { analyticsQuerySchema } from "./analytics.validator";

const router = Router();
const controller = new AnalyticsController();

router.get(
  "/public/summary",
  validate({ query: analyticsQuerySchema }),
  asyncHandler(controller.publicSummary)
);
router.get(
  "/public/trends",
  validate({ query: analyticsQuerySchema }),
  asyncHandler(controller.publicTrends)
);
router.get(
  "/public/departments",
  validate({ query: analyticsQuerySchema }),
  asyncHandler(controller.publicDepartments)
);
router.get(
  "/public/resolution-times",
  validate({ query: analyticsQuerySchema }),
  asyncHandler(controller.publicResolutionTimes)
);
router.get(
  "/public/leaderboard",
  validate({ query: analyticsQuerySchema }),
  asyncHandler(controller.publicLeaderboard)
);
router.get(
  "/public/areas",
  validate({ query: analyticsQuerySchema }),
  asyncHandler(controller.publicAreas)
);
router.get(
  "/public/transparency",
  validate({ query: analyticsQuerySchema }),
  asyncHandler(controller.publicTransparency)
);
router.get(
  "/public/hotspots",
  validate({ query: analyticsQuerySchema }),
  asyncHandler(controller.publicHotspots)
);

router.use(authenticate);
router.use(authorize(UserRole.DEPARTMENT_ADMIN, UserRole.SUPER_ADMIN));

router.get("/dashboard", validate({ query: analyticsQuerySchema }), asyncHandler(controller.dashboard));
router.get("/overview", validate({ query: analyticsQuerySchema }), asyncHandler(controller.overview));
router.get("/trends", validate({ query: analyticsQuerySchema }), asyncHandler(controller.trends));
router.get("/categories", validate({ query: analyticsQuerySchema }), asyncHandler(controller.categories));
router.get("/departments", validate({ query: analyticsQuerySchema }), asyncHandler(controller.departments));
router.get(
  "/department-scores",
  validate({ query: analyticsQuerySchema }),
  asyncHandler(controller.departmentScores)
);
router.get("/officers", validate({ query: analyticsQuerySchema }), asyncHandler(controller.officers));
router.get("/ratings", validate({ query: analyticsQuerySchema }), asyncHandler(controller.ratings));
router.get("/leaderboard", validate({ query: analyticsQuerySchema }), asyncHandler(controller.leaderboard));
router.get("/hotspots", validate({ query: analyticsQuerySchema }), asyncHandler(controller.hotspots));
router.get("/geo", validate({ query: analyticsQuerySchema }), asyncHandler(controller.geo));
router.get(
  "/city-health",
  validate({ query: analyticsQuerySchema }),
  asyncHandler(controller.cityHealth)
);

export { router as analyticsRoutes };
