import { Router } from "express";

import { authenticate } from "middlewares/auth.middleware";
import { chatAudioUpload } from "middlewares/upload-handler";
import { validate } from "middlewares/validate-request";
import { asyncHandler } from "utils/async-handler";

import { ComplaintChatController } from "./chat.controller";
import {
  complaintChatParamsSchema,
  sendComplaintChatMessageSchema,
  sendComplaintVoiceMessageSchema,
  translateComplaintChatMessageSchema
} from "./chat.validator";

const router = Router();
const controller = new ComplaintChatController();

router.use(authenticate);

router.get(
  "/:complaintId",
  validate({ params: complaintChatParamsSchema }),
  asyncHandler(controller.history)
);
router.post(
  "/",
  validate({ body: sendComplaintChatMessageSchema }),
  asyncHandler(controller.send)
);
router.post(
  "/send",
  validate({ body: sendComplaintChatMessageSchema }),
  asyncHandler(controller.send)
);
router.post(
  "/voice",
  chatAudioUpload.single("audio"),
  validate({ body: sendComplaintVoiceMessageSchema }),
  asyncHandler(controller.sendVoice)
);
router.post(
  "/translate",
  validate({ body: translateComplaintChatMessageSchema }),
  asyncHandler(controller.translate)
);

export { router as complaintChatRoutes };
