import { Router } from "express";

import { adminRoutes } from "modules/admin/admin.route";
import { analyticsRoutes } from "modules/analytics/analytics.route";
import { aiContentRoutes } from "modules/ai-content/ai-content.route";
import { saveContentRoutes } from "modules/ai-content/save-content.route";
import { authRoutes } from "modules/auth/auth.route";
import { auditRoutes } from "modules/audit/audit.route";
import { chatbotRoutes } from "modules/chatbot/chatbot.route";
import { complaintChatRoutes } from "modules/chat/chat.route";
import { complaintAiRoutes } from "modules/complaint/complaint-ai.route";
import { complaintAssignmentRoutes } from "modules/complaint/assignment.route";
import { complaintsRoutes } from "modules/complaint/complaint.route";
import { employeesRoutes } from "modules/employee/employees.route";
import { employeeAssistantRoutes, employeePortalRoutes } from "modules/employee-portal/employee-portal.route";
import { emergencyRoutes } from "modules/emergency/emergency.route";
import { evidenceRoutes } from "modules/evidence/evidence.route";
import { fraudRoutes } from "modules/fraud/fraud.route";
import { notificationsRoutes } from "modules/notification/notification.route";
import { ProfileController } from "modules/profile/profile.controller";
import { profileEditableSchema } from "modules/profile/profile.validator";
import { profileRoutes } from "modules/profile/profile.route";
import { ticketsRoutes } from "modules/ticket/ticket.route";
import { usersRoutes } from "modules/user/user.route";
import { verificationRoutes } from "modules/verification/verification.route";
import { healthRoutes } from "routes/health.route";
import { authenticate } from "middlewares/auth.middleware";
import { validate } from "middlewares/validate-request";
import { asyncHandler } from "utils/async-handler";

const router = Router();
const profileController = new ProfileController();

router.use("/health", healthRoutes);
router.use("/admin", adminRoutes);
router.use("/auth", authRoutes);
router.use("/ai-content", aiContentRoutes);
router.use("/save-content", saveContentRoutes);
router.use("/profile", profileRoutes);
router.put(
  "/user/update-profile",
  authenticate,
  validate({ body: profileEditableSchema }),
  asyncHandler(profileController.update)
);
router.use("/tickets", ticketsRoutes);
router.use("/employees", employeesRoutes);
router.use("/employee", employeePortalRoutes);
router.use("/users", usersRoutes);
router.use("/ai-assistant", employeeAssistantRoutes);
router.use("/chatbot", chatbotRoutes);
router.use("/chat", complaintChatRoutes);
router.use("/ai", complaintAiRoutes);
router.use("/assign", complaintAssignmentRoutes);
router.use("/assign-ticket", complaintAssignmentRoutes);
router.use("/complaints", complaintsRoutes);
router.use("/evidence", evidenceRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/audit", auditRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/fraud", fraudRoutes);
router.use("/emergency", emergencyRoutes);
router.use("/verify-task", verificationRoutes);

export { router as apiRouter };
