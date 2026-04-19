import crypto from "node:crypto";

export const hashText = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

