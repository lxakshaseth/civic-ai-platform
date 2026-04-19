type ComplaintRule = {
  issueType: string;
  category: string;
  department: string;
  keywords: string[];
  tags: string[];
  baseUrgency: number;
};

export type ComplaintStructuredAddress = {
  houseNo: string;
  street: string;
  landmark?: string | null;
  area: string;
  city: string;
  pincode: string;
};

export type ComplaintDraftAnalysis = {
  issueType: string;
  urgency: number;
  department: string;
  category: string;
  confidence: number;
  suggestions: {
    title: string;
    description: string;
    department: string;
    tags: string[];
  };
};

const COMPLAINT_RULES: ComplaintRule[] = [
  {
    issueType: "Road damage",
    category: "Roads & Potholes",
    department: "Public Works",
    keywords: ["pothole", "road", "roadside", "asphalt", "footpath", "crack", "damaged road"],
    tags: ["roads", "pothole", "mobility"],
    baseUrgency: 58
  },
  {
    issueType: "Drainage blockage",
    category: "Drainage & Waterlogging",
    department: "Sewerage & Drainage",
    keywords: ["drain", "drainage", "waterlogging", "flood", "clog", "blocked drain", "stagnant water"],
    tags: ["drainage", "waterlogging", "blocked drain"],
    baseUrgency: 72
  },
  {
    issueType: "Garbage accumulation",
    category: "Sanitation & Garbage",
    department: "Solid Waste",
    keywords: ["garbage", "trash", "waste", "sanitation", "dump", "overflowing bin", "unclean"],
    tags: ["garbage", "sanitation", "public health"],
    baseUrgency: 64
  },
  {
    issueType: "Electricity disruption",
    category: "Electricity",
    department: "Power & Utilities",
    keywords: ["electricity", "power", "transformer", "voltage", "live wire", "short circuit", "wire sparking"],
    tags: ["electricity", "power", "electrical risk"],
    baseUrgency: 80
  },
  {
    issueType: "Street light outage",
    category: "Street Lighting",
    department: "Street Lighting",
    keywords: ["street light", "streetlight", "lamp", "dark street", "dark road", "no light"],
    tags: ["street light", "visibility", "night safety"],
    baseUrgency: 62
  },
  {
    issueType: "Water supply issue",
    category: "Water Supply",
    department: "Water Board",
    keywords: ["water", "pipeline", "pipe", "tap", "leakage", "no water", "water supply"],
    tags: ["water", "pipeline", "supply"],
    baseUrgency: 68
  },
  {
    issueType: "Sewage overflow",
    category: "Sewage",
    department: "Sewerage & Drainage",
    keywords: ["sewage", "sewer", "manhole", "overflow", "dirty water", "septic"],
    tags: ["sewage", "overflow", "hygiene"],
    baseUrgency: 76
  },
  {
    issueType: "Traffic disruption",
    category: "Traffic & Parking",
    department: "Traffic & Transport",
    keywords: ["traffic", "parking", "vehicle", "signal", "junction", "congestion", "illegal parking"],
    tags: ["traffic", "parking", "commute"],
    baseUrgency: 55
  },
  {
    issueType: "Public safety concern",
    category: "Public Safety",
    department: "Emergency Response",
    keywords: ["unsafe", "danger", "crime", "accident", "fire", "collapse", "hazard", "emergency"],
    tags: ["safety", "hazard", "emergency"],
    baseUrgency: 86
  },
  {
    issueType: "Health and hygiene issue",
    category: "Health & Hygiene",
    department: "Health Services",
    keywords: ["mosquito", "clinic", "hygiene", "disease", "infection", "stink", "contamination"],
    tags: ["health", "hygiene", "public health"],
    baseUrgency: 70
  }
];

const SEVERITY_KEYWORDS: Array<{ keywords: string[]; bonus: number; tag?: string }> = [
  {
    keywords: ["fire", "electrocution", "live wire", "shock", "collapse", "explosion", "accident"],
    bonus: 22,
    tag: "critical"
  },
  {
    keywords: ["hospital", "school", "market", "junction", "bus stop", "main road"],
    bonus: 12,
    tag: "high impact"
  },
  {
    keywords: ["children", "senior citizen", "pregnant", "disabled", "elderly"],
    bonus: 8,
    tag: "vulnerable groups"
  },
  {
    keywords: ["overflow", "blocked", "leak", "leakage", "dark", "stagnant", "sparking"],
    bonus: 10,
    tag: "active hazard"
  },
  {
    keywords: ["days", "weeks", "every day", "continuous", "since morning", "since yesterday"],
    bonus: 6,
    tag: "persistent"
  }
];

function normalizeText(value?: string | null) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function uniqueTags(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => normalizeText(value).toLowerCase()).filter(Boolean))];
}

function pickRule(text: string, title: string) {
  const normalizedTitle = title.toLowerCase();

  let bestRule = COMPLAINT_RULES[0];
  let bestScore = 0;
  let bestMatches: string[] = [];

  for (const rule of COMPLAINT_RULES) {
    const matches = rule.keywords.filter((keyword) => text.includes(keyword.toLowerCase()));
    const titleMatches = rule.keywords.filter((keyword) => normalizedTitle.includes(keyword.toLowerCase()));
    const score = matches.length * 1.2 + titleMatches.length * 1.8;

    if (score > bestScore) {
      bestRule = rule;
      bestScore = score;
      bestMatches = [...matches, ...titleMatches];
    }
  }

  if (!bestScore) {
    return {
      rule: {
        issueType: "General civic issue",
        category: "Other",
        department: "Municipal Revenue",
        keywords: [],
        tags: ["civic", "needs review"],
        baseUrgency: 42
      } satisfies ComplaintRule,
      matches: [] as string[],
      score: 0
    };
  }

  return {
    rule: bestRule,
    matches: [...new Set(bestMatches)],
    score: bestScore
  };
}

function deriveUrgency(rule: ComplaintRule, text: string) {
  let urgency = rule.baseUrgency;
  const matchedSeverityTags: string[] = [];

  for (const item of SEVERITY_KEYWORDS) {
    if (item.keywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
      urgency += item.bonus;
      if (item.tag) {
        matchedSeverityTags.push(item.tag);
      }
    }
  }

  if (text.includes("urgent") || text.includes("immediately")) {
    urgency += 10;
    matchedSeverityTags.push("urgent");
  }

  return {
    urgency: clamp(Math.round(urgency), 18, 100),
    matchedSeverityTags
  };
}

function deriveConfidence(score: number, matchedKeywords: string[]) {
  if (!score || !matchedKeywords.length) {
    return 0.52;
  }

  return Number(clamp(0.58 + score * 0.04 + matchedKeywords.length * 0.03, 0.58, 0.97).toFixed(2));
}

function buildSuggestionTitle(title: string, issueType: string) {
  const normalizedTitle = normalizeText(title);

  if (normalizedTitle.length >= 8) {
    return normalizedTitle;
  }

  return `${issueType} requiring civic attention`;
}

function buildSuggestionDescription(input: {
  title: string;
  description: string;
  issueType: string;
  category: string;
  department: string;
  urgency: number;
}) {
  const summarySource = normalizeText(`${input.title}. ${input.description}`)
    .replace(/\.+/g, ".")
    .slice(0, 220);

  return [
    `Issue detected: ${input.issueType}.`,
    `Suggested category: ${input.category}.`,
    `Suggested department: ${input.department}.`,
    `Estimated urgency: ${input.urgency}/100.`,
    `Citizen summary: ${summarySource || "Location-specific civic issue reported and requires field verification."}`
  ].join(" ");
}

export function normalizeStructuredAddress(
  input?: Partial<ComplaintStructuredAddress> | null
): ComplaintStructuredAddress | null {
  if (!input) {
    return null;
  }

  const normalized = {
    houseNo: normalizeText(input.houseNo),
    street: normalizeText(input.street),
    landmark: normalizeText(input.landmark) || null,
    area: normalizeText(input.area),
    city: normalizeText(input.city),
    pincode: normalizeText(input.pincode).replace(/\D/g, "").slice(0, 6)
  };

  if (!normalized.houseNo && !normalized.street && !normalized.area && !normalized.city && !normalized.pincode) {
    return null;
  }

  return normalized;
}

export function buildFullAddress(address?: Partial<ComplaintStructuredAddress> | null) {
  const normalized = normalizeStructuredAddress(address);

  if (!normalized) {
    return "";
  }

  return [
    normalized.houseNo,
    normalized.street,
    normalized.landmark || null,
    normalized.area,
    normalized.city,
    normalized.pincode
  ]
    .filter(Boolean)
    .join(", ");
}

export function derivePriorityFromUrgency(urgency: number) {
  if (urgency >= 76) {
    return "High" as const;
  }

  if (urgency <= 44) {
    return "Low" as const;
  }

  return "Medium" as const;
}

export function analyzeComplaintDraft(input: {
  title: string;
  description: string;
}): ComplaintDraftAnalysis {
  const normalizedTitle = normalizeText(input.title);
  const normalizedDescription = normalizeText(input.description);
  const text = `${normalizedTitle} ${normalizedDescription}`.toLowerCase();
  const { rule, matches, score } = pickRule(text, normalizedTitle);
  const urgencyResult = deriveUrgency(rule, text);
  const confidence = deriveConfidence(score, matches);
  const tags = uniqueTags([
    ...rule.tags,
    ...matches.map((value) => titleCase(value)),
    ...urgencyResult.matchedSeverityTags.map((value) => titleCase(value))
  ]).slice(0, 6);

  return {
    issueType: rule.issueType,
    urgency: urgencyResult.urgency,
    department: rule.department,
    category: rule.category,
    confidence,
    suggestions: {
      title: buildSuggestionTitle(normalizedTitle, rule.issueType),
      description: buildSuggestionDescription({
        title: normalizedTitle,
        description: normalizedDescription,
        issueType: rule.issueType,
        category: rule.category,
        department: rule.department,
        urgency: urgencyResult.urgency
      }),
      department: rule.department,
      tags
    }
  };
}
