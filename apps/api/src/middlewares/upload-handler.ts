import path from "node:path";

import type { Request } from "express";
import multer from "multer";
import { StatusCodes } from "http-status-codes";
import { v4 as uuid } from "uuid";

import { uploadConfig } from "config/upload.config";
import { queueAuditLogJob } from "queues/jobs/audit.job";
import { AppError } from "shared/errors/app-error";

type UploadFilterConfig = {
  allowedMimeTypes: string[];
  allowedExtensionsByMime: Record<string, string[]>;
};

const buildDiskStorage = (destination: string) =>
  multer.diskStorage({
    destination,
    filename: (_req, file, callback) => {
      const safeOriginalName = path.basename(file.originalname.trim());
      const extension = path.extname(safeOriginalName).toLowerCase();
      const baseName = path
        .basename(safeOriginalName, extension)
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80) || uuid();

      callback(null, `${Date.now()}-${baseName}${extension}`);
    }
  });

const logUploadRejection = (
  req: Request,
  file: Express.Multer.File,
  reason: string,
  metadata?: Record<string, unknown>
) => {
  void queueAuditLogJob({
    userId: req.user?.id,
    action: "security.upload_rejected",
    entity: "Security",
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
    metadata: {
      reason,
      originalName: file.originalname,
      mimeType: file.mimetype,
      method: req.method,
      path: req.originalUrl,
      ...metadata
    }
  }).catch(() => undefined);
};

const buildFileFilter =
  (filterConfig: UploadFilterConfig): multer.Options["fileFilter"] =>
  (req, file, callback) => {
  const safeOriginalName = path.basename(file.originalname.trim());
  const extension = path.extname(safeOriginalName).toLowerCase();
  const allowedExtensions = filterConfig.allowedExtensionsByMime[file.mimetype] ?? [];

  if (!safeOriginalName || safeOriginalName !== file.originalname.trim()) {
    logUploadRejection(req, file, "invalid_filename");
    callback(new AppError("Invalid file name", StatusCodes.BAD_REQUEST, "INVALID_FILE_NAME"));
    return;
  }

  if (safeOriginalName.length > 255) {
    logUploadRejection(req, file, "filename_too_long");
    callback(new AppError("Invalid file name", StatusCodes.BAD_REQUEST, "INVALID_FILE_NAME"));
    return;
  }

  if (!filterConfig.allowedMimeTypes.includes(file.mimetype)) {
    logUploadRejection(req, file, "invalid_mime_type");
    callback(new AppError("Unsupported file type", StatusCodes.BAD_REQUEST, "INVALID_FILE_TYPE"));
    return;
  }

  if (!extension || !allowedExtensions.includes(extension)) {
    logUploadRejection(req, file, "extension_mismatch", {
      extension,
      allowedExtensions
    });
    callback(new AppError("Unsupported file type", StatusCodes.BAD_REQUEST, "INVALID_FILE_TYPE"));
    return;
  }

  callback(null, true);
};

const buildUpload = (destination: string, filterConfig: UploadFilterConfig) =>
  multer({
    storage: buildDiskStorage(destination),
    limits: {
      fileSize: uploadConfig.maxFileSize
    },
    fileFilter: buildFileFilter(filterConfig)
  });

const defaultUploadFilterConfig: UploadFilterConfig = {
  allowedMimeTypes: uploadConfig.allowedMimeTypes,
  allowedExtensionsByMime: uploadConfig.allowedExtensionsByMime
};

const chatAudioFilterConfig: UploadFilterConfig = {
  allowedMimeTypes: uploadConfig.chatAudioMimeTypes,
  allowedExtensionsByMime: uploadConfig.chatAudioExtensionsByMime
};

export const complaintUpload = buildUpload(uploadConfig.complaintsDir, defaultUploadFilterConfig);
export const evidenceUpload = buildUpload(uploadConfig.evidenceDir, defaultUploadFilterConfig);
export const verificationUpload = buildUpload(uploadConfig.tempDir, defaultUploadFilterConfig);
export const chatAudioUpload = buildUpload(uploadConfig.chatDir, chatAudioFilterConfig);
