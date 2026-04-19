const DEPARTMENT_GROUPS = [
  ["water", "water board", "water supply"],
  ["road", "roads", "public works", "roads potholes"],
  ["sanitation", "solid waste", "sewerage drainage", "drainage", "sewage"],
  ["electricity", "power utilities", "street lighting", "street light"],
  ["traffic transport", "traffic", "transport"],
  ["health services", "health hygiene", "health"],
  ["emergency response", "public safety", "emergency"],
  ["municipal revenue", "revenue"],
] as const;

export function normalizeDepartmentName(value?: string | null) {
  return value
    ?.trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() ?? "";
}

export function getDepartmentAliases(value?: string | null) {
  const normalizedValue = normalizeDepartmentName(value);

  if (!normalizedValue) {
    return [] as string[];
  }

  const matchingGroup = DEPARTMENT_GROUPS.find((group) =>
    group.some(
      (label) =>
        label === normalizedValue ||
        normalizedValue.includes(label) ||
        label.includes(normalizedValue)
    )
  );

  if (!matchingGroup) {
    return [normalizedValue];
  }

  return [...new Set(matchingGroup)];
}

export function departmentsMatch(left?: string | null, right?: string | null) {
  const leftAliases = new Set(getDepartmentAliases(left));
  const rightAliases = getDepartmentAliases(right);

  if (!leftAliases.size || !rightAliases.length) {
    return false;
  }

  return rightAliases.some((alias) => leftAliases.has(alias));
}
