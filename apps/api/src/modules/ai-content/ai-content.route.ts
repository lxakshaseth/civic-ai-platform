import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate } from "middlewares/auth.middleware";
import { authorize } from "middlewares/role.middleware";
import { validate } from "middlewares/validate-request";
import { asyncHandler } from "utils/async-handler";

import { AiContentController } from "./ai-content.controller";
import { aiContentIdParamsSchema, aiContentRequestSchema } from "./ai-content.validator";

const router = Router();
const controller = new AiContentController();

router.use(authenticate);
router.use(authorize(UserRole.CITIZEN));

router.post("/", validate({ body: aiContentRequestSchema }), asyncHandler(controller.generate));
router.post(
  "/:id/like",
  validate({ params: aiContentIdParamsSchema }),
  asyncHandler(controller.toggleLike)
);

export { router as aiContentRoutes };
