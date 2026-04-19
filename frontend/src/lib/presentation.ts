import { formatUserRole, type ApiUserRole } from "./session";

export function normalizeComplaintStatusKey(status?: string | null) {
  const normalizedStatus = status?.trim().toLowerCase().replace(/[\s-]+/g, "_");

  switch (normalizedStatus) {
    case "resolved":
    case "closed":
    case "completed":
      return "completed";
    case "verified":
      return "verified";
    case "pending_admin_approval":
      return "pending_admin_approval";
    case "reassigned":
    case "reopened":
      return "reassigned";
    case "in_progress":
      return "in_progress";
    case "assigned":
      return "assigned";
    case "submitted":
    case "open":
    case "pending":
      return "submitted";
    default:
      return "pending";
  }
}

export function formatComplaintStatus(status?: string | null) {
  const normalizedStatus = normalizeComplaintStatusKey(status);

  switch (normalizedStatus) {
    case "assigned":
      return "Assigned";
    case "in_progress":
      return "In Progress";
    case "pending_admin_approval":
      return "Pending Admin Approval";
    case "reassigned":
      return "Reassigned";
    case "completed":
      return "Completed";
    case "verified":
      return "Verified";
    case "submitted":
      return "Submitted";
    default:
      return "Pending";
  }
}

export function getComplaintStatusClasses(status?: string | null) {
  const normalizedStatus = normalizeComplaintStatusKey(status);

  switch (normalizedStatus) {
    case "verified":
      return "bg-emerald-100 text-emerald-700";
    case "completed":
      return "bg-green-100 text-green-700";
    case "in_progress":
      return "bg-blue-100 text-blue-700";
    case "pending_admin_approval":
      return "bg-violet-100 text-violet-700";
    case "reassigned":
      return "bg-orange-100 text-orange-700";
    case "assigned":
      return "bg-amber-100 text-amber-700";
    case "submitted":
    case "pending":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function formatPriority(priority?: string | null) {
  const normalizedPriority = priority?.trim().toLowerCase();

  if (normalizedPriority === "high") {
    return "High";
  }

  if (normalizedPriority === "low") {
    return "Low";
  }

  return "Medium";
}

export function getPriorityClasses(priority?: string | null) {
  const normalizedPriority = priority?.trim().toLowerCase();

  if (normalizedPriority === "high") {
    return "bg-red-100 text-red-700";
  }

  if (normalizedPriority === "low") {
    return "bg-green-100 text-green-700";
  }

  return "bg-yellow-100 text-yellow-700";
}

export function formatRoleLabel(role?: ApiUserRole | null) {
  return formatUserRole(role);
}

export function formatDate(value?: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  });
}

export function formatShortDate(value?: string | null) {
  return formatDate(value, {
    hour: "2-digit",
    minute: "2-digit",
  });
}
