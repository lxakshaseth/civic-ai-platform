import { Router } from "express";

import { authenticate } from "middlewares/auth.middleware";
import { validate } from "middlewares/validate-request";
import { asyncHandler } from "utils/async-handler";

import { ProfileController } from "./profile.controller";
import { profileUpsertSchema } from "./profile.validator";

const router = Router();
const controller = new ProfileController();

router.use(authenticate);

router.get("/", asyncHandler(controller.get));
router.post("/", validate({ body: profileUpsertSchema }), asyncHandler(controller.create));
router.put("/", validate({ body: profileUpsertSchema }), asyncHandler(controller.update));

export { router as profileRoutes };
