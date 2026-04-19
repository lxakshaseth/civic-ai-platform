import { UserRole } from "@prisma/client";

import { queryCivicPlatform } from "database/clients/civic-platform";

export interface ComplaintChatParticipantRecord {
  id: string;
  title: string;
  status: string | null;
  citizenId: string;
  assignedEmployeeId: string | null;
  departmentId: string | null;
  citizen: {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
  };
  assignedEmployee: {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
  } | null;
}

export interface ComplaintChatMessageRecord {
  id: string;
  complaintId: string;
  senderId: string;
  receiverId: string;
  message: string;
  translatedMessage: string | null;
  language: string;
  translatedLanguage: string | null;
  audioUrl: string | null;
  audioMimeType: string | null;
  audioDurationMs: number | null;
  createdAt: string;
  senderName: string;
  senderRole: UserRole;
  receiverName: string;
  receiverRole: UserRole;
}

type ComplaintParticipantRow = {
  id: string;
  title: string | null;
  status: string | null;
  citizenId: string | null;
  assignedEmployeeId: string | null;
  departmentId: string | null;
  citizenName: string | null;
  citizenEmail: string | null;
  citizenRole: string | null;
  assignedEmployeeName: string | null;
  assignedEmployeeEmail: string | null;
  assignedEmployeeRole: string | null;
};

type ChatUserRow = {
  id: string;
  fullName: string | null;
  email: string | null;
  role: string | null;
};

const normalizeRole = (value?: string | null): UserRole => {
  const normalized = value?.trim().toUpperCase();

  if (normalized === UserRole.SUPER_ADMIN) return UserRole.SUPER_ADMIN;
  if (normalized === UserRole.DEPARTMENT_ADMIN) return UserRole.DEPARTMENT_ADMIN;
  if (normalized === UserRole.EMPLOYEE) return UserRole.EMPLOYEE;
  return UserRole.CITIZEN;
};

const mapChatUser = (row: ChatUserRow) => ({
  id: row.id,
  fullName: row.fullName?.trim() || "User",
  email: row.email?.trim() || "",
  role: normalizeRole(row.role)
});

export class ComplaintChatRepository {
  async findComplaintParticipants(complaintId: string) {
    const result = await queryCivicPlatform<ComplaintParticipantRow>(
      `
        SELECT
          c.id,
          c.title,
          c.status::text AS status,
          c.citizen_id AS "citizenId",
          c.assigned_employee_id AS "assignedEmployeeId",
          c.department AS "departmentId",
          citizen.name AS "citizenName",
          citizen.email AS "citizenEmail",
          citizen.role AS "citizenRole",
          employee.name AS "assignedEmployeeName",
          employee.email AS "assignedEmployeeEmail",
          employee.role AS "assignedEmployeeRole"
        FROM public.complaints c
        LEFT JOIN public.users citizen
          ON citizen.id = c.citizen_id
        LEFT JOIN public.users employee
          ON employee.id = c.assigned_employee_id
        WHERE c.id = $1
        LIMIT 1
      `,
      [complaintId]
    );

    const row = result.rows[0];

    if (!row?.citizenId || !row.citizenName) {
      return null;
    }

    return {
      id: row.id,
      title: row.title?.trim() || "Complaint",
      status: row.status?.trim() || null,
      citizenId: row.citizenId,
      assignedEmployeeId: row.assignedEmployeeId,
      departmentId: row.departmentId,
      citizen: {
        id: row.citizenId,
        fullName: row.citizenName,
        email: row.citizenEmail?.trim() || "",
        role: normalizeRole(row.citizenRole)
      },
      assignedEmployee:
        row.assignedEmployeeId && row.assignedEmployeeName
          ? {
              id: row.assignedEmployeeId,
              fullName: row.assignedEmployeeName,
              email: row.assignedEmployeeEmail?.trim() || "",
              role: normalizeRole(row.assignedEmployeeRole)
            }
          : null
    } satisfies ComplaintChatParticipantRecord;
  }

  async listMessagesByComplaint(complaintId: string) {
    const result = await queryCivicPlatform<ComplaintChatMessageRecord>(
      `
        SELECT
          c.id::text AS id,
          c.complaint_id AS "complaintId",
          c.sender_id AS "senderId",
          c.receiver_id AS "receiverId",
          c.comment AS message,
          c.translated_message AS "translatedMessage",
          COALESCE(c.language, 'en') AS language,
          c.translated_language AS "translatedLanguage",
          c.audio_url AS "audioUrl",
          c.audio_mime_type AS "audioMimeType",
          c.audio_duration_ms AS "audioDurationMs",
          c.created_at::text AS "createdAt",
          sender.name AS "senderName",
          sender.role AS "senderRole",
          receiver.name AS "receiverName",
          receiver.role AS "receiverRole"
        FROM public.comments c
        INNER JOIN public.users sender
          ON sender.id = c.sender_id
        INNER JOIN public.users receiver
          ON receiver.id = c.receiver_id
        WHERE c.complaint_id = $1
          AND c.receiver_id IS NOT NULL
        ORDER BY c.created_at ASC, c.id ASC
      `,
      [complaintId]
    );

    return result.rows.map((row) => ({
      ...row,
      senderName: row.senderName?.trim() || "User",
      senderRole: normalizeRole(row.senderRole),
      receiverName: row.receiverName?.trim() || "User",
      receiverRole: normalizeRole(row.receiverRole)
    }));
  }

  async findUsersByIds(ids: string[]) {
    if (!ids.length) {
      return [];
    }

    const result = await queryCivicPlatform<ChatUserRow>(
      `
        SELECT
          id,
          name AS "fullName",
          email,
          role
        FROM public.users
        WHERE id = ANY($1::uuid[])
      `,
      [ids]
    );

    return result.rows.map(mapChatUser);
  }

  async findEscalationAdmins(departmentId?: string | null) {
    const result = await queryCivicPlatform<ChatUserRow>(
      `
        SELECT
          id,
          name AS "fullName",
          email,
          role
        FROM public.users
        WHERE UPPER(COALESCE(role, '')) IN ('DEPARTMENT_ADMIN', 'SUPER_ADMIN')
          AND (
            $1::text IS NULL
            OR COALESCE(department, '') = ''
            OR LOWER(COALESCE(department, '')) = LOWER($1)
            OR UPPER(COALESCE(role, '')) = 'SUPER_ADMIN'
          )
        ORDER BY role DESC, name ASC
      `,
      [departmentId?.trim() || null]
    );

    return result.rows.map(mapChatUser);
  }

  async createMessage(data: {
    complaintId: string;
    senderId: string;
    receiverId: string;
    message: string;
    translatedMessage?: string | null;
    language: string;
    translatedLanguage?: string | null;
    audioUrl?: string | null;
    audioMimeType?: string | null;
    audioDurationMs?: number | null;
  }) {
    const result = await queryCivicPlatform<ComplaintChatMessageRecord>(
      `
        WITH inserted AS (
          INSERT INTO public.comments (
            complaint_id,
            sender_id,
            receiver_id,
            comment,
            translated_message,
            language,
            translated_language,
            audio_url,
            audio_mime_type,
            audio_duration_ms,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
          RETURNING *
        )
        SELECT
          inserted.id::text AS id,
          inserted.complaint_id AS "complaintId",
          inserted.sender_id AS "senderId",
          inserted.receiver_id AS "receiverId",
          inserted.comment AS message,
          inserted.translated_message AS "translatedMessage",
          COALESCE(inserted.language, 'en') AS language,
          inserted.translated_language AS "translatedLanguage",
          inserted.audio_url AS "audioUrl",
          inserted.audio_mime_type AS "audioMimeType",
          inserted.audio_duration_ms AS "audioDurationMs",
          inserted.created_at::text AS "createdAt",
          sender.name AS "senderName",
          sender.role AS "senderRole",
          receiver.name AS "receiverName",
          receiver.role AS "receiverRole"
        FROM inserted
        INNER JOIN public.users sender
          ON sender.id = inserted.sender_id
        INNER JOIN public.users receiver
          ON receiver.id = inserted.receiver_id
      `,
      [
        data.complaintId,
        data.senderId,
        data.receiverId,
        data.message.trim(),
        data.translatedMessage ?? null,
        data.language.trim().toLowerCase(),
        data.translatedLanguage?.trim().toLowerCase() || null,
        data.audioUrl ?? null,
        data.audioMimeType ?? null,
        data.audioDurationMs ?? null
      ]
    );

    const row = result.rows[0];

    return {
      ...row,
      senderRole: normalizeRole(row.senderRole),
      receiverRole: normalizeRole(row.receiverRole)
    };
  }
}
