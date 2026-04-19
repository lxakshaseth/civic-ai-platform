import { Prisma } from "@prisma/client";
import { Worker } from "bullmq";

import { env } from "config/env";
import { QUEUE_NAMES } from "constants/queue-names";
import { SOCKET_EVENTS } from "constants/socket-events";
import { aiClient } from "integrations/ai/ai.client";
import { ComplaintsRepository } from "modules/complaint/complaint.repository";
import { FraudService } from "modules/fraud/fraud.service";
import { queueAuditLogJob } from "queues/jobs/audit.job";
import { bullMqConnection } from "queues/connection";
import { emitToComplaintRoom, emitToUserRoom } from "sockets/socket.server";

const complaintsRepository = new ComplaintsRepository();
const fraudService = new FraudService();

const inferDepartmentId = async (category?: string) => {
  if (!category) {
    return undefined;
  }

  const departments = await complaintsRepository.findDepartments();
  const normalizedCategory = category.toLowerCase();

  return departments.find((department) => {
    const haystack = `${department.name} ${department.description ?? ""}`.toLowerCase();
    return haystack.includes(normalizedCategory) || normalizedCategory.includes(department.name.toLowerCase());
  })?.id;
};

export const createComplaintAiWorker = () =>
  new Worker(
  QUEUE_NAMES.complaintAi,
    async (job) => {
      const complaint = await complaintsRepository.findById(job.data.complaintId);

      if (!complaint) {
        return null;
      }

      const [classification, urgency] = await Promise.all([
        aiClient.classifyComplaint({
          complaintId: complaint.id,
          title: complaint.title,
          description: complaint.description
        }),
        aiClient.detectUrgency({
          complaintId: complaint.id,
          title: complaint.title,
          description: complaint.description
        })
      ]);

      const departmentId = complaint.departmentId ?? (await inferDepartmentId(classification.category));
      const fraudAssessment = await fraudService.evaluateComplaintDraft({
        citizenId: complaint.citizenId,
        title: complaint.title,
        description: complaint.description,
        category: classification.category,
        latitude: complaint.latitude != null ? Number(complaint.latitude) : undefined,
        longitude: complaint.longitude != null ? Number(complaint.longitude) : undefined,
        locationAddress: complaint.locationAddress ?? undefined,
        excludeComplaintId: complaint.id
      });

      const updatedComplaint = await complaintsRepository.updateAiSignals(complaint.id, {
        aiCategory: classification.category,
        aiPriority: urgency.priority,
        aiConfidence: Math.max(classification.confidence, urgency.confidence),
        category: complaint.category ?? classification.category,
        priority: complaint.priority ?? urgency.priority,
        departmentId,
        duplicateScore: fraudAssessment.duplicateScore,
        fraudScore: fraudAssessment.fraudScore,
        isSuspicious: fraudAssessment.isSuspicious,
        duplicateComplaintId: fraudAssessment.duplicateComplaintId ?? null,
        fraudSignals: {
          alertLevel: fraudAssessment.alertLevel,
          signals: fraudAssessment.signals,
          reasons: fraudAssessment.reasons,
          explanation: fraudAssessment.explanation
        } as Prisma.InputJsonValue
      });

      await queueAuditLogJob({
        userId: complaint.citizenId,
        action: "complaint.ai_enriched",
        entity: "Complaint",
        entityId: complaint.id,
        metadata: {
          aiCategory: classification.category,
          aiPriority: urgency.priority,
          aiConfidence: Math.max(classification.confidence, urgency.confidence),
          departmentId: departmentId ?? null,
          duplicateScore: fraudAssessment.duplicateScore,
          fraudScore: fraudAssessment.fraudScore,
          isSuspicious: fraudAssessment.isSuspicious,
          alertLevel: fraudAssessment.alertLevel,
          reasonCodes: fraudAssessment.reasons.map((reason) => reason.code)
        }
      });

      if (fraudAssessment.isSuspicious) {
        await queueAuditLogJob({
          userId: complaint.citizenId,
          action: "complaint.fraud_flagged",
          entity: "Complaint",
          entityId: complaint.id,
          metadata: {
            duplicateScore: fraudAssessment.duplicateScore,
            fraudScore: fraudAssessment.fraudScore,
            alertLevel: fraudAssessment.alertLevel,
            reasons: fraudAssessment.reasons
          }
        });
      }

      emitToComplaintRoom(updatedComplaint.id, SOCKET_EVENTS.complaintUpdated, updatedComplaint);
      emitToUserRoom(updatedComplaint.citizenId, SOCKET_EVENTS.complaintUpdated, updatedComplaint);

      if (updatedComplaint.assignedEmployeeId) {
        emitToUserRoom(updatedComplaint.assignedEmployeeId, SOCKET_EVENTS.complaintUpdated, updatedComplaint);
      }

      return updatedComplaint;
    },
    {
      connection: bullMqConnection,
      prefix: env.QUEUE_PREFIX
    }
  );
