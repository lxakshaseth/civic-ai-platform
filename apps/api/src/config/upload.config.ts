import fs from "node:fs";
import path from "node:path";

import { env } from "config/env";

const uploadsRoot = path.resolve(process.cwd(), "uploads");
const complaintsDir = path.join(uploadsRoot, "complaints");
const evidenceDir = path.join(uploadsRoot, "evidence");
const chatDir = path.join(uploadsRoot, "chat");
const tempDir = path.resolve(process.cwd(), env.UPLOAD_TEMP_DIR);

[uploadsRoot, complaintsDir, evidenceDir, chatDir, tempDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

export const uploadConfig = {
  uploadsRoot,
  complaintsDir,
  evidenceDir,
  chatDir,
  tempDir,
  maxFileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  allowedExtensionsByMime: {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/webp": [".webp"],
    "application/pdf": [".pdf"]
  } as Record<string, string[]>,
  chatAudioMimeTypes: [
    "audio/webm",
    "audio/mp4",
    "audio/mpeg",
    "audio/ogg",
    "audio/wav",
    "audio/x-wav"
  ],
  chatAudioExtensionsByMime: {
    "audio/webm": [".webm"],
    "audio/mp4": [".mp4", ".m4a"],
    "audio/mpeg": [".mp3"],
    "audio/ogg": [".ogg", ".oga"],
    "audio/wav": [".wav"],
    "audio/x-wav": [".wav"]
  } as Record<string, string[]>
};
