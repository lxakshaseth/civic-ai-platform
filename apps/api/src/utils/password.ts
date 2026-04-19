import bcrypt from "bcryptjs";

const bcryptHashPattern = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const legacyPasswordPlaceholders = new Map<string, string>([
  // Existing seeded admin rows were stored with a fake bcrypt-looking placeholder.
  ["$2b$10$examplehashedpassword1234567890", "admin123"]
]);

export const hashPassword = (plainPassword: string) => bcrypt.hash(plainPassword, 12);

export const comparePassword = (plainPassword: string, passwordHash: string) =>
  bcrypt.compare(plainPassword, passwordHash);

export const isBcryptHash = (value: string) => bcryptHashPattern.test(value.trim());

export async function verifyPassword(plainPassword: string, storedPassword: string) {
  const normalizedStoredPassword = storedPassword.trim();

  if (!normalizedStoredPassword) {
    return {
      matched: false,
      needsUpgrade: false
    };
  }

  if (isBcryptHash(normalizedStoredPassword)) {
    return {
      matched: await comparePassword(plainPassword, normalizedStoredPassword),
      needsUpgrade: false
    };
  }

  const legacyPlaceholderPassword = legacyPasswordPlaceholders.get(normalizedStoredPassword);

  if (legacyPlaceholderPassword) {
    const matched =
      plainPassword === legacyPlaceholderPassword ||
      plainPassword === normalizedStoredPassword;

    return {
      matched,
      needsUpgrade: plainPassword === legacyPlaceholderPassword
    };
  }

  const matched = plainPassword === normalizedStoredPassword;

  return {
    matched,
    needsUpgrade: matched
  };
}
