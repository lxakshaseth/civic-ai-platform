const durationMap: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000
};

export const durationToMs = (value: string): number => {
  const normalized = value.trim();
  const match = normalized.match(/^(\d+)([smhd])$/);

  if (!match) {
    throw new Error(`Unsupported duration format: ${value}`);
  }

  const [, amount, unit] = match;
  return Number(amount) * durationMap[unit];
};

