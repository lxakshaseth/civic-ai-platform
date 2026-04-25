import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate } from "middlewares/auth.middleware";
import { authorize } from "middlewares/role.middleware";
import { sanitaryUpload } from "middlewares/upload-handler";
import { validate } from "middlewares/validate-request";
import { asyncHandler } from "utils/async-handler";

import { SanitaryController } from "./sanitary.controller";
import { createSanitaryRequestSchema } from "./sanitary.validator";

const router = Router();
const controller = new SanitaryController();

router.use(authenticate);
router.use(authorize(UserRole.CITIZEN));

router.post(
  "/requests",
  sanitaryUpload.single("billFile"),
  validate({ body: createSanitaryRequestSchema }),
  asyncHandler(controller.create)
);

export { router as sanitaryRoutes };
