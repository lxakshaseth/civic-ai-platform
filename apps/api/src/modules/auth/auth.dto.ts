import type { UserRole } from "@prisma/client";

export interface AuthResponseUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  departmentId: string | null;
  gender?: string | null;
  language?: string | null;
  profileCompleted?: boolean;
  showSanitaryFeature?: boolean;
}
