import { UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

import { SOCKET_EVENTS } from "constants/socket-events";
import { GoogleTranslateClient } from "integrations/translation/google-translate.client";
import { ProfileRepository } from "modules/profile/profile.repository";
import { queueNotificationJob } from "queues/jobs/notification.job";
import { AppError } from "shared/errors/app-error";
import { emitToChatRoom, emitToUserRoom } from "sockets/socket.server";
import { toPublicUploadPath } from "utils/uploads";

import {
  ComplaintChatParticipantRecord,
  ComplaintChatMessageRecord,
  ComplaintChatRepository
} from "./chat.repository";

type Actor = {
  id: string;
  email: string;
  role: UserRole;
};

const defaultLanguage = "en";

function normalizeLanguage(value?: string | null) {
  return value?.trim().toLowerCase() || defaultLanguage;
}

function isComplaintChatClosed(status?: string | null) {
  return status?.trim().toUpperCase() === "CLOSED";
}

function presentChatMessage(message: ComplaintChatMessageRecord) {
  return {
    id: message.id,
    complaintId: message.complaintId,
    senderId: message.senderId,
    receiverId: message.receiverId,
    message: message.message,
    translatedMessage: message.translatedMessage,
    language: normalizeLanguage(message.language),
    translatedLanguage: message.translatedLanguage
      ? normalizeLanguage(message.translatedLanguage)
      : null,
    audioUrl: toPublicUploadPath(message.audioUrl),
    audioMimeType: message.audioMimeType,
    audioDurationMs: message.audioDurationMs,
    createdAt: message.createdAt,
    sender: {
      id: message.senderId,
      name: message.senderName,
      role: message.senderRole
    },
    receiver: {
      id: message.receiverId,
      name: message.receiverName,
      role: message.receiverRole
    }
  };
}

export class ComplaintChatService {
  constructor(
    private readonly chatRepository: ComplaintChatRepository = new ComplaintChatRepository(),
    private readonly profileRepository: ProfileRepository = new ProfileRepository(),
    private readonly translateClient: GoogleTranslateClient = new GoogleTranslateClient()
  ) {}

  async listComplaintChat(complaintId: string, actor: Actor) {
    await this.assertComplaintChatAccess(complaintId, actor);
    const messages = await this.chatRepository.listMessagesByComplaint(complaintId);
    return messages.map(presentChatMessage);
  }

  async sendMessage(
    input: {
      complaintId: string;
      message: string;
      receiverId?: string;
    },
    actor: Actor
  ) {
    const complaint = await this.assertComplaintChatAccess(input.complaintId, actor);
    const normalizedMessage = input.message.trim();

    if (isComplaintChatClosed(complaint.status)) {
      throw new AppError(
        "Chat is closed after admin approval",
        StatusCodes.BAD_REQUEST,
        "CHAT_CLOSED"
      );
    }

    if (!normalizedMessage) {
      throw new AppError(
        "Message is required",
        StatusCodes.BAD_REQUEST,
        "CHAT_MESSAGE_REQUIRED"
      );
    }

    const receiver = await this.resolveReceiver(complaint, actor, input.receiverId);

    if (!receiver) {
      throw new AppError(
        "No chat participant is available for this complaint conversation",
        StatusCodes.BAD_REQUEST,
        "CHAT_NOT_ACTIVE"
      );
    }

    const [senderProfile, receiverProfile] = await Promise.all([
      this.profileRepository.findByEmail(actor.email),
      this.profileRepository.findByEmail(receiver.email)
    ]);

    const senderLanguage = normalizeLanguage(senderProfile?.language);
    const receiverLanguage = normalizeLanguage(receiverProfile?.language);
    const translation =
      senderLanguage === receiverLanguage
        ? {
            translatedText: null,
            detectedSourceLanguage: senderLanguage,
            translatedLanguage: receiverLanguage
          }
        : await this.translateClient.translateText({
            text: normalizedMessage,
            targetLanguage: receiverLanguage
          });

    const createdMessage = await this.chatRepository.createMessage({
      complaintId: complaint.id,
      senderId: actor.id,
      receiverId: receiver.id,
      message: normalizedMessage,
      translatedMessage: translation.translatedText,
      language: normalizeLanguage(translation.detectedSourceLanguage || senderLanguage),
      translatedLanguage: translation.translatedText ? receiverLanguage : null
    });

    const presentedMessage = presentChatMessage(createdMessage);

    console.log("MESSAGE SENT:", {
      complaintId: complaint.id,
      messageId: presentedMessage.id,
      senderId: actor.id,
      receiverId: receiver.id
    });

    emitToChatRoom(complaint.id, SOCKET_EVENTS.chatMessageCreated, presentedMessage);
    emitToUserRoom(actor.id, SOCKET_EVENTS.chatMessageCreated, presentedMessage);
    emitToUserRoom(receiver.id, SOCKET_EVENTS.chatMessageCreated, presentedMessage);

    const notificationRecipients = [
      complaint.citizen.id,
      complaint.assignedEmployee?.id ?? null,
      receiver.id
    ].filter((userId): userId is string => Boolean(userId) && userId !== actor.id);

    void Promise.allSettled(
      [...new Set(notificationRecipients)].map((userId) =>
        queueNotificationJob({
          userId,
          complaintId: complaint.id,
          type: "CHAT_MESSAGE",
          title: "New complaint chat message",
          message: `${presentedMessage.sender.name} sent a new message about complaint ${complaint.id}.`,
          data: {
            complaintId: complaint.id,
            messageId: presentedMessage.id
          }
        })
      )
    ).catch(() => undefined);

    return presentedMessage;
  }

  async sendVoiceMessage(
    input: {
      complaintId: string;
      message?: string;
      receiverId?: string;
      durationMs?: number;
    },
    actor: Actor,
    file?: Express.Multer.File
  ) {
    if (!file) {
      throw new AppError("Voice message audio is required", StatusCodes.BAD_REQUEST, "CHAT_AUDIO_REQUIRED");
    }

    const complaint = await this.assertComplaintChatAccess(input.complaintId, actor);

    if (isComplaintChatClosed(complaint.status)) {
      throw new AppError(
        "Chat is closed after admin approval",
        StatusCodes.BAD_REQUEST,
        "CHAT_CLOSED"
      );
    }

    const receiver = await this.resolveReceiver(complaint, actor, input.receiverId);

    if (!receiver) {
      throw new AppError(
        "No chat participant is available for this complaint conversation",
        StatusCodes.BAD_REQUEST,
        "CHAT_NOT_ACTIVE"
      );
    }

    const normalizedMessage = input.message?.trim() || "";

    const [senderProfile, receiverProfile] = await Promise.all([
      this.profileRepository.findByEmail(actor.email),
      this.profileRepository.findByEmail(receiver.email)
    ]);

    const senderLanguage = normalizeLanguage(senderProfile?.language);
    const receiverLanguage = normalizeLanguage(receiverProfile?.language);
    const translation =
      !normalizedMessage || senderLanguage === receiverLanguage
        ? {
            translatedText: null,
            detectedSourceLanguage: senderLanguage,
            translatedLanguage: receiverLanguage
          }
        : await this.translateClient.translateText({
            text: normalizedMessage,
            targetLanguage: receiverLanguage
          });

    const createdMessage = await this.chatRepository.createMessage({
      complaintId: complaint.id,
      senderId: actor.id,
      receiverId: receiver.id,
      message: normalizedMessage,
      translatedMessage: translation.translatedText,
      language: normalizeLanguage(translation.detectedSourceLanguage || senderLanguage),
      translatedLanguage: translation.translatedText ? receiverLanguage : null,
      audioUrl: file.path.replace(/\\/g, "/"),
      audioMimeType: file.mimetype,
      audioDurationMs: input.durationMs ?? null
    });

    const presentedMessage = presentChatMessage(createdMessage);

    emitToChatRoom(complaint.id, SOCKET_EVENTS.chatMessageCreated, presentedMessage);
    emitToUserRoom(actor.id, SOCKET_EVENTS.chatMessageCreated, presentedMessage);
    emitToUserRoom(receiver.id, SOCKET_EVENTS.chatMessageCreated, presentedMessage);

    const notificationRecipients = [
      complaint.citizen.id,
      complaint.assignedEmployee?.id ?? null,
      receiver.id
    ].filter((userId): userId is string => Boolean(userId) && userId !== actor.id);

    void Promise.allSettled(
      [...new Set(notificationRecipients)].map((userId) =>
        queueNotificationJob({
          userId,
          complaintId: complaint.id,
          type: "CHAT_MESSAGE",
          title: "New complaint voice message",
          message: `${presentedMessage.sender.name} sent a voice message about complaint ${complaint.id}.`,
          data: {
            complaintId: complaint.id,
            messageId: presentedMessage.id
          }
        })
      )
    ).catch(() => undefined);

    return presentedMessage;
  }

  async translateMessage(
    input: {
      complaintId: string;
      text: string;
      targetLanguage: string;
      sourceLanguage?: string;
    },
    actor: Actor
  ) {
    await this.assertComplaintChatAccess(input.complaintId, actor);

    const translation = await this.translateClient.translateText({
      text: input.text.trim(),
      targetLanguage: normalizeLanguage(input.targetLanguage),
      sourceLanguage: input.sourceLanguage ? normalizeLanguage(input.sourceLanguage) : undefined
    });

    return {
      translatedText: translation.translatedText || input.text.trim(),
      targetLanguage: normalizeLanguage(translation.translatedLanguage),
      sourceLanguage: normalizeLanguage(translation.detectedSourceLanguage || input.sourceLanguage)
    };
  }

  async canAccessComplaintChat(complaintId: string, actor: Pick<Actor, "id" | "role">) {
    const complaint = await this.chatRepository.findComplaintParticipants(complaintId);

    if (!complaint || !complaint.assignedEmployeeId || isComplaintChatClosed(complaint.status)) {
      return false;
    }

    const isAssignedEmployee =
      actor.role === UserRole.EMPLOYEE && complaint.assignedEmployeeId === actor.id;
    const isCitizenOwner = actor.role === UserRole.CITIZEN && complaint.citizenId === actor.id;
    const isAdmin =
      actor.role === UserRole.DEPARTMENT_ADMIN || actor.role === UserRole.SUPER_ADMIN;

    return isAssignedEmployee || isCitizenOwner || isAdmin;
  }

  private async assertComplaintChatAccess(complaintId: string, actor: Actor) {
    const complaint = await this.chatRepository.findComplaintParticipants(complaintId);

    if (!complaint) {
      throw new AppError("Complaint not found", StatusCodes.NOT_FOUND, "COMPLAINT_NOT_FOUND");
    }

    if (!complaint.assignedEmployeeId) {
      throw new AppError(
        "Chat becomes available only after complaint assignment",
        StatusCodes.BAD_REQUEST,
        "CHAT_NOT_ACTIVE"
      );
    }

    const isAssignedEmployee =
      actor.role === UserRole.EMPLOYEE && complaint.assignedEmployeeId === actor.id;
    const isCitizenOwner = actor.role === UserRole.CITIZEN && complaint.citizenId === actor.id;
    const isAdmin =
      actor.role === UserRole.DEPARTMENT_ADMIN || actor.role === UserRole.SUPER_ADMIN;

    if (!isAssignedEmployee && !isCitizenOwner && !isAdmin) {
      throw new AppError("Forbidden", StatusCodes.FORBIDDEN, "FORBIDDEN");
    }

    return complaint;
  }

  private async resolveReceiver(
    complaint: ComplaintChatParticipantRecord,
    actor: Actor,
    receiverId?: string
  ) {
    const adminParticipants = await this.chatRepository.findEscalationAdmins(complaint.departmentId);

    if (receiverId) {
      const users = await this.chatRepository.findUsersByIds([receiverId]);
      const receiver = users[0] ?? null;

      if (!receiver) {
        throw new AppError(
          "Selected chat participant was not found",
          StatusCodes.NOT_FOUND,
          "CHAT_RECEIVER_NOT_FOUND"
        );
      }

      const allowedParticipantIds = new Set([
        complaint.citizen.id,
        complaint.assignedEmployee?.id ?? null,
        ...adminParticipants.map((participant) => participant.id)
      ]);

      if (!allowedParticipantIds.has(receiver.id) || receiver.id === actor.id) {
        throw new AppError("Invalid chat receiver", StatusCodes.BAD_REQUEST, "CHAT_RECEIVER_INVALID");
      }

      return receiver;
    }

    if (actor.role === UserRole.CITIZEN) {
      return complaint.assignedEmployee ?? adminParticipants[0] ?? null;
    }

    if (actor.role === UserRole.EMPLOYEE) {
      return complaint.citizen ?? adminParticipants[0] ?? null;
    }

    if (actor.role === UserRole.DEPARTMENT_ADMIN || actor.role === UserRole.SUPER_ADMIN) {
      return complaint.assignedEmployee ?? complaint.citizen ?? null;
    }

    return null;
  }
}
