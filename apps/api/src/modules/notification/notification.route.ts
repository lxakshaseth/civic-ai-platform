import { Router } from "express";

import { authenticate } from "middlewares/auth.middleware";
import { validate } from "middlewares/validate-request";
import { asyncHandler } from "utils/async-handler";

import { NotificationsController } from "./notification.controller";
import {
  listNotificationsQuerySchema,
  markNotificationsReadSchema,
  notificationIdParamsSchema
} from "./notification.validator";

const router = Router();
const controller = new NotificationsController();

router.use(authenticate);

router.get("/", validate({ query: listNotificationsQuerySchema }), asyncHandler(controller.list));
router.get("/stats", asyncHandler(controller.stats));
router.put("/read", validate({ body: markNotificationsReadSchema }), asyncHandler(controller.markReadCompat));
router.patch("/:id/read", validate({ params: notificationIdParamsSchema }), asyncHandler(controller.markRead));
router.patch("/read-all", asyncHandler(controller.markAllRead));

export { router as notificationsRoutes };
