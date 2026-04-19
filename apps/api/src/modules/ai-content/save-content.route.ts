import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate } from "middlewares/auth.middleware";
import { authorize } from "middlewares/role.middleware";
import { validate } from "middlewares/validate-request";
import { asyncHandler } from "utils/async-handler";

import { AiContentController } from "./ai-content.controller";
import { saveContentBodySchema, savedContentQuerySchema } from "./ai-content.validator";

const router = Router();
const controller = new AiContentController();

router.use(authenticate);
router.use(authorize(UserRole.CITIZEN));

router.get("/", validate({ query: savedContentQuerySchema }), asyncHandler(controller.saved));
router.post("/", validate({ body: saveContentBodySchema }), asyncHandler(controller.toggleSave));

export { router as saveContentRoutes };
