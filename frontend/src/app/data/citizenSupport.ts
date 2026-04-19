export const defaultSupportPincode = "110001";

export type SupportZone = {
  prefix: string;
  city: string;
  district: string;
  state: string;
  coverageLabel: string;
  note: string;
};

export type SanitaryStore = {
  id: string;
  name: string;
  area: string;
  address: string;
  contact: string;
  distance: string;
  eta: string;
  openHours: string;
  reimbursementLimit: number;
  stockStatus: "In Stock" | "Limited Stock";
  payoutWindow: string;
  brands: string[];
  serviceablePrefixes: string[];
};

export type EmergencyContact = {
  id: string;
  name: string;
  department: string;
  phone: string;
  secondaryPhone?: string;
  address: string;
  responseTime: string;
  availability: string;
  services: string[];
  serviceablePrefixes: string[];
};

const supportZones: SupportZone[] = [
  {
    prefix: "110",
    city: "New Delhi",
    district: "Central Delhi",
    state: "Delhi",
    coverageLabel: "Connaught Place, Karol Bagh and nearby wards",
    note: "Women support desks and civic medical partners are mapped ward-wise for faster reimbursement validation.",
  },
  {
    prefix: "122",
    city: "Gurugram",
    district: "Gurugram",
    state: "Haryana",
    coverageLabel: "Sector 14, Sector 29 and nearby residential sectors",
    note: "Partner chemists and emergency desks support quick pickup with same-day reimbursement review.",
  },
  {
    prefix: "201",
    city: "Noida",
    district: "Gautam Buddh Nagar",
    state: "Uttar Pradesh",
    coverageLabel: "Sector 18, Sector 62 and nearby neighborhoods",
    note: "Citizen care teams coordinate with district hospitals and women helplines from the nearest mapped zone.",
  },
  {
    prefix: "500",
    city: "Hyderabad",
    district: "Hyderabad",
    state: "Telangana",
    coverageLabel: "Abids, Himayatnagar and nearby urban clusters",
    note: "Emergency response cards prioritize women safety lines, ambulance coverage, and civic facilitation desks.",
  },
  {
    prefix: "560",
    city: "Bengaluru",
    district: "Bengaluru Urban",
    state: "Karnataka",
    coverageLabel: "MG Road, Indiranagar and nearby service wards",
    note: "Reimbursement partners are grouped by 24x7 access and GST invoice readiness.",
  },
];

const sanitaryStores: SanitaryStore[] = [
  {
    id: "store-delhi-1",
    name: "Sakhi Wellness Pharmacy",
    area: "Connaught Place",
    address: "A-12, Rajiv Chowk Inner Circle, New Delhi",
    contact: "+91 11 4100 2211",
    distance: "1.8 km",
    eta: "8 min",
    openHours: "24x7",
    reimbursementLimit: 650,
    stockStatus: "In Stock",
    payoutWindow: "Funds usually transferred within 6-12 hours after GST bill review.",
    brands: ["Whisper", "Stayfree", "Nua"],
    serviceablePrefixes: ["110"],
  },
  {
    id: "store-gurugram-1",
    name: "Metro Women Care Store",
    area: "Sector 29",
    address: "SCO 21, Sector 29 Market, Gurugram",
    contact: "+91 124 440 3355",
    distance: "2.2 km",
    eta: "9 min",
    openHours: "6:30 AM - 11:30 PM",
    reimbursementLimit: 700,
    stockStatus: "In Stock",
    payoutWindow: "Claims from mapped pincodes are fast-tracked for same-day transfer.",
    brands: ["Whisper", "Nua", "Bella"],
    serviceablePrefixes: ["122"],
  },
  {
    id: "store-noida-1",
    name: "Citizen Health Chemist",
    area: "Sector 18",
    address: "Shop 8, Atta Market, Sector 18, Noida",
    contact: "+91 120 420 1108",
    distance: "1.4 km",
    eta: "6 min",
    openHours: "24x7",
    reimbursementLimit: 600,
    stockStatus: "In Stock",
    payoutWindow: "Bill review confirms GST details before the platform pushes the transfer.",
    brands: ["Whisper", "Stayfree", "Carefree"],
    serviceablePrefixes: ["201"],
  },
  {
    id: "store-hyderabad-1",
    name: "Arogya Pad Partner Counter",
    area: "Himayatnagar",
    address: "3-6-215, Himayatnagar Main Road, Hyderabad",
    contact: "+91 40 4400 8170",
    distance: "2.1 km",
    eta: "10 min",
    openHours: "7:00 AM - 12:00 AM",
    reimbursementLimit: 620,
    stockStatus: "Limited Stock",
    payoutWindow: "Verified bills are queued for transfer to the registered buyer wallet or bank account.",
    brands: ["Stayfree", "Bella", "Nua"],
    serviceablePrefixes: ["500"],
  },
  {
    id: "store-bengaluru-1",
    name: "Civic Care Medical Hub",
    area: "Indiranagar",
    address: "221 CMH Road, Indiranagar, Bengaluru",
    contact: "+91 80 4310 5512",
    distance: "1.9 km",
    eta: "8 min",
    openHours: "24x7",
    reimbursementLimit: 680,
    stockStatus: "In Stock",
    payoutWindow: "Platform transfer is initiated after invoice verification and duplicate check.",
    brands: ["Whisper", "Nua", "Sofy"],
    serviceablePrefixes: ["560"],
  },
];

const emergencyContacts: EmergencyContact[] = [
  {
    id: "contact-delhi-1",
    name: "Central Women Support Desk",
    department: "Women Assistance Cell",
    phone: "181",
    secondaryPhone: "+91 11 4300 2101",
    address: "District Facilitation Centre, Connaught Place, New Delhi",
    responseTime: "8-12 min dispatch support",
    availability: "24x7",
    services: ["Women safety escalation", "Urgent sanitary assistance", "Shelter coordination"],
    serviceablePrefixes: ["110"],
  },
  {
    id: "contact-gurugram-1",
    name: "Gurugram Rapid Help Cell",
    department: "District Emergency Desk",
    phone: "112",
    secondaryPhone: "+91 124 470 1120",
    address: "Mini Secretariat Support Desk, Sector 38, Gurugram",
    responseTime: "10 min average callback",
    availability: "24x7",
    services: ["Emergency dispatch", "Police coordination", "Women support routing"],
    serviceablePrefixes: ["122"],
  },
  {
    id: "contact-noida-1",
    name: "Noida Citizen Safety Line",
    department: "Integrated Response Support",
    phone: "112",
    secondaryPhone: "+91 120 430 2244",
    address: "Sector 20 Emergency Response Desk, Noida",
    responseTime: "9-14 min",
    availability: "24x7",
    services: ["Ambulance linkage", "Police response", "Family notification support"],
    serviceablePrefixes: ["201"],
  },
  {
    id: "contact-hyderabad-1",
    name: "Hyderabad Women Helpline Hub",
    department: "Women Protection Support",
    phone: "181",
    secondaryPhone: "+91 40 4300 1811",
    address: "Abids Integrated Civic Support Counter, Hyderabad",
    responseTime: "7-10 min",
    availability: "24x7",
    services: ["Immediate counselling", "Police connect", "Safe transit support"],
    serviceablePrefixes: ["500"],
  },
  {
    id: "contact-bengaluru-1",
    name: "Bengaluru Civic Emergency Desk",
    department: "Integrated Control Room",
    phone: "112",
    secondaryPhone: "+91 80 4300 1122",
    address: "MG Road Command Desk, Bengaluru",
    responseTime: "8-12 min",
    availability: "24x7",
    services: ["Rapid dispatch", "Women assistance", "Urban incident reporting"],
    serviceablePrefixes: ["560"],
  },
];

export function normalizePincode(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function getSupportZone(pincode: string) {
  const prefix = normalizePincode(pincode).slice(0, 3);

  if (!prefix) {
    return supportZones[0];
  }

  return supportZones.find((zone) => zone.prefix === prefix);
}

function getMatchScore(prefixes: string[], pincode: string) {
  const normalized = normalizePincode(pincode);
  const prefix = normalized.slice(0, 3);

  if (!prefix) {
    return 0;
  }

  if (prefixes.includes(normalized)) {
    return 3;
  }

  if (prefixes.includes(prefix)) {
    return 2;
  }

  if (normalized.length >= 2 && prefixes.some((item) => item.slice(0, 2) === normalized.slice(0, 2))) {
    return 1;
  }

  return 0;
}

function getClosestItems<T extends { serviceablePrefixes: string[] }>(items: T[], pincode: string, limit = 4) {
  const normalized = normalizePincode(pincode);

  if (!normalized) {
    return items.slice(0, limit);
  }

  const ranked = items
    .map((item) => ({
      item,
      score: getMatchScore(item.serviceablePrefixes, normalized),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.item);

  return (ranked.length > 0 ? ranked : items).slice(0, limit);
}

export function getNearestSanitaryStores(pincode: string) {
  return getClosestItems(sanitaryStores, pincode);
}

export function getNearestEmergencyContacts(pincode: string) {
  return getClosestItems(emergencyContacts, pincode);
}

export function getNationalEmergencyContacts() {
  return [
    { label: "National Emergency", phone: "112", description: "Police, fire, and urgent dispatch coordination" },
    { label: "Ambulance", phone: "108", description: "Medical emergency and hospital transport" },
    { label: "Women Helpline", phone: "181", description: "Women safety, crisis response, and counselling support" },
  ];
}
