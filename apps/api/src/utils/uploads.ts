import { appConfig } from "config/app.config";
import path from "node:path";

import { uploadConfig } from "config/upload.config";

export const toPublicUploadPath = (filePath?: string | null) => {
  if (!filePath) {
    return filePath ?? null;
  }

  if (/^(https?:)?\/\//i.test(filePath) || filePath.startsWith("data:")) {
    return filePath;
  }

  const normalizedPath = filePath.replace(/\\/g, "/");
  const normalizedUploadsRoot = uploadConfig.uploadsRoot.replace(/\\/g, "/");
  const uploadsIndex = normalizedPath.lastIndexOf("/uploads/");

  if (uploadsIndex >= 0) {
    return toAbsoluteUploadUrl(normalizedPath.slice(uploadsIndex));
  }

  if (normalizedPath.startsWith("uploads/")) {
    return toAbsoluteUploadUrl(`/${normalizedPath}`);
  }

  if (normalizedPath.startsWith("/uploads/")) {
    return toAbsoluteUploadUrl(normalizedPath);
  }

  if (normalizedPath.startsWith(normalizedUploadsRoot)) {
    const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
    return toAbsoluteUploadUrl(relativePath.startsWith("/") ? relativePath : `/${relativePath}`);
  }

  return normalizedPath;
};

const toAbsoluteUploadUrl = (relativePath: string) =>
  relativePath.startsWith("http")
    ? relativePath
    : `${appConfig.publicBaseUrl}${relativePath.startsWith("/") ? relativePath : `/${relativePath}`}`;
