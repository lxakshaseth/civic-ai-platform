import { Router } from "express";

import { authenticate } from "middlewares/auth.middleware";
import { validate } from "middlewares/validate-request";
import { asyncHandler } from "utils/async-handler";

import { ChatbotController } from "./chatbot.controller";
import { chatbotMessageSchema, chatbotSessionQuerySchema } from "./chatbot.validator";

const router = Router();
const controller = new ChatbotController();

router.get("/public/session", validate({ query: chatbotSessionQuerySchema }), asyncHandler(controller.publicSession));
router.post("/public/messages", validate({ body: chatbotMessageSchema }), asyncHandler(controller.sendPublicMessage));

router.use(authenticate);
router.get("/session", validate({ query: chatbotSessionQuerySchema }), asyncHandler(controller.session));
router.post("/messages", validate({ body: chatbotMessageSchema }), asyncHandler(controller.sendMessage));

export { router as chatbotRoutes };
