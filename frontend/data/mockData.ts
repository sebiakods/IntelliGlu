export type RiskLevel = "Low" | "Medium" | "Moderate" | "High" | "Critical";
export type PatientStatus = "Stable" | "Monitoring" | "At Risk" | "Critical";
export type GlucoseTrend = "Rising" | "Falling" | "Stable";

export interface Patient {
  id: string; name: string; age: number; sex: "M" | "F";
  icuStay: number; diagnosis: string; diabetes: string;
  currentGlucose: number; glucoseTrend: GlucoseTrend;
  timeInRange: number; hypoglycemiaRisk: RiskLevel;
  hypoglycemiaRiskPct: number; lastInsulinAction: number;
  lastInsulinTime: string; nextCheck: string; status: PatientStatus;
  weight: number; height: number; heartRate: number;
  bloodPressure: string; respiratoryRate: number;
  spo2: number; temperature: number; creatinine: number;
  wbc: number; potassium: number;
  mrn?: string; room?: string; attending?: string;
}

export interface GlucosePoint {
  time: string; glucose: number; insulin?: number;
}

export function generateGlucoseTrend(base = 180, points = 48): GlucosePoint[] {
  const data: GlucosePoint[] = [];
  let g = base + 80;
  for (let i = 0; i < points; i++) {
    const h = Math.floor((i / points) * 24);
    const m = Math.floor(((i % Math.ceil(points / 24)) / Math.ceil(points / 24)) * 60);
    g = Math.max(70, Math.min(320, g + (Math.random() - 0.53) * 20));
    data.push({
      time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      glucose: Math.round(g),
      insulin: i % 6 === 0 ? Math.round(Math.random() * 5 + 1) : undefined,
    });
  }
  return data;
}

export const PATIENTS: Patient[] = [
  { id:"ICU-1025", name:"John Doe",      age:68, sex:"M", icuStay:3, diagnosis:"Sepsis",         diabetes:"Type 2",   currentGlucose:178, glucoseTrend:"Rising",  timeInRange:72, hypoglycemiaRisk:"Low",      hypoglycemiaRiskPct:4,  lastInsulinAction:4, lastInsulinTime:"1 hour ago",   nextCheck:"11:00 AM", status:"Stable",     weight:78, height:175, heartRate:88, bloodPressure:"120/70", respiratoryRate:18, spo2:97, temperature:37.1, creatinine:1.1, wbc:9.8,  potassium:4.2, mrn:"78654321", room:"ICU-12", attending:"Dr. Ahmed" },
  { id:"ICU-1008", name:"Mary Johnson",  age:72, sex:"F", icuStay:1, diagnosis:"Pneumonia",       diabetes:"Type 2",   currentGlucose:165, glucoseTrend:"Stable",  timeInRange:68, hypoglycemiaRisk:"Low",      hypoglycemiaRiskPct:6,  lastInsulinAction:2, lastInsulinTime:"2 hours ago",  nextCheck:"11:30 AM", status:"Stable",     weight:65, height:162, heartRate:92, bloodPressure:"130/80", respiratoryRate:20, spo2:95, temperature:38.2, creatinine:0.9, wbc:12.4, potassium:3.8, mrn:"78654322", room:"ICU-08", attending:"Dr. Ahmed" },
  { id:"ICU-1017", name:"Robert Chen",   age:61, sex:"M", icuStay:2, diagnosis:"Post-Operative",  diabetes:"No Diabetes", currentGlucose:205, glucoseTrend:"Rising",  timeInRange:45, hypoglycemiaRisk:"Moderate", hypoglycemiaRiskPct:12, lastInsulinAction:6, lastInsulinTime:"45 min ago",   nextCheck:"10:45 AM", status:"Monitoring", weight:82, height:178, heartRate:76, bloodPressure:"145/90", respiratoryRate:16, spo2:98, temperature:37.5, creatinine:1.3, wbc:8.1,  potassium:4.0, mrn:"78654323", room:"ICU-03", attending:"Dr. Sarah" },
  { id:"ICU-1033", name:"Fatima Ali",    age:55, sex:"F", icuStay:4, diagnosis:"Sepsis",          diabetes:"Type 2",   currentGlucose:92,  glucoseTrend:"Falling", timeInRange:84, hypoglycemiaRisk:"High",     hypoglycemiaRiskPct:22, lastInsulinAction:1, lastInsulinTime:"3 hours ago",  nextCheck:"10:30 AM", status:"At Risk",    weight:58, height:160, heartRate:105,bloodPressure:"100/65", respiratoryRate:22, spo2:94, temperature:38.9, creatinine:1.8, wbc:15.2, potassium:3.5, mrn:"78654324", room:"ICU-05", attending:"Dr. Ahmed" },
  { id:"ICU-0999", name:"David Brown",   age:74, sex:"M", icuStay:5, diagnosis:"ARDS",            diabetes:"Type 2",   currentGlucose:248, glucoseTrend:"Rising",  timeInRange:38, hypoglycemiaRisk:"High",     hypoglycemiaRiskPct:28, lastInsulinAction:8, lastInsulinTime:"30 min ago",   nextCheck:"10:30 AM", status:"At Risk",    weight:90, height:180, heartRate:98, bloodPressure:"155/95", respiratoryRate:28, spo2:91, temperature:37.8, creatinine:2.1, wbc:11.3, potassium:4.8, mrn:"78654325", room:"ICU-01", attending:"Dr. Sarah" },
  { id:"ICU-1044", name:"Emma Wilson",   age:47, sex:"F", icuStay:1, diagnosis:"Stroke",          diabetes:"No Diabetes", currentGlucose:134, glucoseTrend:"Stable",  timeInRange:76, hypoglycemiaRisk:"Low",      hypoglycemiaRiskPct:5,  lastInsulinAction:3, lastInsulinTime:"2 hours ago",  nextCheck:"12:00 PM", status:"Stable",     weight:63, height:168, heartRate:80, bloodPressure:"125/75", respiratoryRate:16, spo2:99, temperature:36.8, creatinine:0.8, wbc:7.2,  potassium:4.1, mrn:"78654326", room:"ICU-09", attending:"Dr. Ahmed" },
];

export interface Alert {
  id: string; severity: "Critical"|"High"|"Medium"|"Low";
  patientId: string; type: string; message: string;
  minutesAgo: number; time: string;
  glucose?: number; trend?: string;
}

export const ALERTS: Alert[] = [
  { id:"A1", severity:"Critical", patientId:"ICU-1025", type:"Severe Hypoglycemia Risk", message:"Predicted risk 82% — falling trend, last dose 2U", minutesAgo:2,  time:"10:00 AM", glucose:78,  trend:"Falling" },
  { id:"A2", severity:"High",     patientId:"ICU-0999", type:"Hyperglycemia (High)",    message:"Glucose 248 mg/dL — above target range",           minutesAgo:5,  time:"09:55 AM", glucose:248, trend:"Rising" },
  { id:"A3", severity:"High",     patientId:"ICU-1017", type:"Missed Glucose Check",    message:"Overdue by 75 min — last check at 09:00 AM",        minutesAgo:15, time:"09:45 AM" },
  { id:"A4", severity:"Medium",   patientId:"ICU-1033", type:"Unstable Glucose Trend",  message:"High variability detected over past 4 hours",       minutesAgo:22, time:"09:38 AM", glucose:92, trend:"Falling" },
  { id:"A5", severity:"Medium",   patientId:"ICU-1008", type:"Hyperglycemia (Moderate)","message":"Glucose 186 mg/dL — slightly above target",       minutesAgo:30, time:"09:30 AM", glucose:186 },
  { id:"A6", severity:"Low",      patientId:"ICU-1044", type:"Glucose Variability",     message:"Slightly above target — continue monitoring",       minutesAgo:45, time:"09:15 AM" },
  { id:"A7", severity:"Low",      patientId:"ICU-1003", type:"Check Recommended",        message:"Next check suggested per protocol",                minutesAgo:52, time:"09:08 AM" },
];

export const ANALYTICS_WEEKLY = [
  { week:"Apr 27", timeInRange:68, hypoglycemia:4.8, hyperglycemia:11.2 },
  { week:"May 4",  timeInRange:70, hypoglycemia:4.5, hyperglycemia:10.8 },
  { week:"May 11", timeInRange:69, hypoglycemia:4.7, hyperglycemia:10.5 },
  { week:"May 18", timeInRange:72, hypoglycemia:4.1, hyperglycemia:9.3  },
  { week:"May 24", timeInRange:72, hypoglycemia:4.1, hyperglycemia:9.3  },
];

export const UNIT_PERFORMANCE = [
  { icu:"City Hospital ICU", patients:412, tir:72, hypo:4.1, hyperSevere:9.3,  acceptance:87 },
  { icu:"MICU",              patients:98,  tir:74, hypo:3.6, hyperSevere:8.7,  acceptance:88 },
  { icu:"SICU",              patients:86,  tir:70, hypo:4.7, hyperSevere:10.6, acceptance:84 },
  { icu:"CCU",               patients:74,  tir:71, hypo:3.9, hyperSevere:8.1,  acceptance:89 },
  { icu:"Neuro ICU",         patients:68,  tir:68, hypo:4.6, hyperSevere:11.5, acceptance:83 },
  { icu:"Burn ICU",          patients:52,  tir:69, hypo:5.2, hyperSevere:12.4, acceptance:82 },
  { icu:"Step-down ICU",     patients:34,  tir:75, hypo:3.1, hyperSevere:6.9,  acceptance:90 },
];