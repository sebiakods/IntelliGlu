/**
 * simulator.ts — CQL Frontend Simulator
 * FIXED: Correct Q-values for ALL glucose ranges including ≥ 4 g/L (400 mg/dL)
 * REALISTIC: Patient starts critical → CQL doses → glucose stabilises in target (140-180)
 */
import { PatientData } from "./patientStore";

// ── Action space ──────────────────────────────────────────────────────────────
export const CQL_N_ACTIONS = 6;
export const ACTION_DOSES: Record<number, number> = {
  0: 0.0, 1: 0.5, 2: 1.5, 3: 3.0, 4: 5.0, 5: 8.0,
};
export const ACTION_LABELS: Record<number, string> = {
  0: "No Dose (0 U)",
  1: "Low (0–1 U)",
  2: "Low-Med (1–2.5 U)",
  3: "Medium (2.5–4 U)",
  4: "Med-High (4–6 U)",
  5: "High (≥6 U)",
};

// ── MDP constants ─────────────────────────────────────────────────────────────
const TARGET_LOW  = 140.0;
const TARGET_HIGH = 180.0;
const HYPO       = 70.0;
const SAFE_LOW   = 110.0;

// ── Normalisation ─────────────────────────────────────────────────────────────
function norm(v: number, lo: number, hi: number): number {
  return Math.max(0, Math.min(1, (v - lo) / (hi - lo + 1e-9)));
}

export function buildStateVector(p: PatientData, glucoseDelta: number, insulinLags: number[], timeSinceDose: number): number[] {
  const [sbpStr, dbpStr] = (p.bloodPressure || "120/75").split("/");
  const sbp = parseFloat(sbpStr) || 120;
  const dbp = parseFloat(dbpStr) || 75;
  const hourFrac = (new Date().getHours() * 60 + new Date().getMinutes()) / 60.0;
  return [
    norm(p.currentGlucose, 55, 450),
    norm(p.heartRate,       30, 180),
    norm(sbp,               60, 220),
    norm(dbp,               30, 140),
    norm(p.respiratoryRate, 5,  50),
    norm(p.spo2,            70, 100),
    norm(p.temperature,     34, 41),
    norm(24.0,              5,  50),
    norm(100.0,             80, 130),
    norm(p.creatinine || 1.0, 0.1, 20),
    norm(15.0,              2,  150),
    norm(p.potassium || 4.0, 2, 8),
    norm(140.0,             120, 165),
    norm(12.0,              4,  20),
    norm(p.wbc || 8.0,      0.5, 60),
    norm(50.0,              0,  500),
    norm(p.age,             18, 90),
    norm(p.icuStay,         0,  30),
    norm(hourFrac,          0,  720),
    p.sex === "M" ? 1.0 : 0.0,
    0.0,
    Math.max(-1, Math.min(1, glucoseDelta / 50.0)),
    Math.max(0, Math.min(1, (insulinLags[0] || 0) / 10)),
    Math.max(0, Math.min(1, (insulinLags[1] || 0) / 10)),
    Math.max(0, Math.min(1, (insulinLags[2] || 0) / 10)),
    Math.max(0, Math.min(1, timeSinceDose)),
  ];
}

function softmax(arr: number[]): number[] {
  const max = Math.max(...arr);
  const exps = arr.map(v => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(v => v / sum);
}

export interface CQLResult {
  action: number;
  dose: number;
  label: string;
  qValues: number[];
  probabilities: number[];
  confidence: number;
  safetyAdjusted: boolean;
  safetyWarnings: string[];
}

/**
 * FIXED heuristic Q-values — exact replica of Python backend _heuristic_q_values()
 * Correctly maps glucose > 300 mg/dL (> 3 g/L) to action 5 (High ≥6U)
 */
function heuristicQBase(glucose: number): number[] {
  const q = new Array(6).fill(0.0);
  if      (glucose < 70)   q[0] = 2.0;   // Hypoglycemia → No dose
  else if (glucose <= 140) q[0] = 1.5;   // Normal-low → No dose
  else if (glucose <= 180) q[1] = 1.0;   // Mild high → Low
  else if (glucose <= 220) q[2] = 1.0;   // Moderate → Low-Med
  else if (glucose <= 260) q[3] = 1.0;   // High → Medium
  else if (glucose <= 300) q[4] = 1.0;   // Very high → Med-High
  else                     q[5] = 1.0;   // Severe ≥300 → High (≥6U)
  return q;
}

export function runCQLFrontend(
  glucose: number,
  glucoseDelta: number = 0,
  insulinLag1: number = 0,
  creatinine: number = 1.0,
  age: number = 60,
  timeSinceDose: number = 1.0,
): CQLResult {
  const q_base = heuristicQBase(glucose);

  // Contextual penalties (mirror CQL conservatism)
  const renalPenalty = Math.max(0, (creatinine - 1.5) * 0.25);
  const agePenalty   = Math.max(0, (age - 72) * 0.008);
  const stackPenalty = Math.max(0, insulinLag1 * 0.12);
  const deltaBias    = glucoseDelta > 15 ? 0.08 : glucoseDelta < -15 ? -0.08 : 0;

  const cqlConservative = [0.0, 0.0, 0.04, 0.08, 0.14 + renalPenalty + agePenalty, 0.18 + renalPenalty + agePenalty];
  const stackPenalties  = [0,   stackPenalty, stackPenalty, stackPenalty*1.2, stackPenalty*1.5, stackPenalty*2];

  const q_values = q_base.map((v, i) => {
    let val = v - cqlConservative[i] - stackPenalties[i];
    if (i > 0 && glucose > TARGET_HIGH) val += deltaBias * (i / 5);
    return val;
  });

  let action = q_values.indexOf(Math.max(...q_values));
  const warnings: string[] = [];
  let adjusted = false;

  // Safety rules
  if (glucose < HYPO && action > 0) {
    warnings.push(`Hypoglycémie (${glucose.toFixed(0)} mg/dL) — Pas d'insuline. Administrer glucose.`);
    action = 0; adjusted = true;
  } else if (glucose < SAFE_LOW && action > 1) {
    warnings.push(`Glucose bas (${glucose.toFixed(0)} mg/dL) — dose réduite.`);
    action = 1; adjusted = true;
  } else if (action >= 4 && glucose < TARGET_HIGH) {
    warnings.push(`Dose élevée avec glucose ${glucose.toFixed(0)} mg/dL — risque de surdose. Réduit.`);
    action -= 1; adjusted = true;
  }
  if (glucose > 300 && action === 0 && !adjusted) {
    warnings.push(`⚠ Hyperglycémie sévère (${glucose.toFixed(0)} mg/dL / ${(glucose/100).toFixed(1)} g/L) — révision urgente.`);
  }

  const probs = softmax(q_values);
  const confidence = probs[action];

  return {
    action,
    dose: ACTION_DOSES[action],
    label: ACTION_LABELS[action],
    qValues: q_values,
    probabilities: probs,
    confidence,
    safetyAdjusted: adjusted,
    safetyWarnings: warnings,
  };
}

// ── Realistic physiology simulation ───────────────────────────────────────────
// Each step = 1 ICU hour
// Insulin effect: ~18-25 mg/dL drop per unit over 2h (peak)
// Natural drift: hyperglycemic patients drift UP ~3-6 mg/dL/h without insulin

const INSULIN_EFFECT_PER_UNIT = 20;   // mg/dL per unit (over 1h)
const STRESS_DRIFT_FACTOR = 3.5;      // mg/dL/h natural rise (diabetes/ICU)

export function simulateGlucoseStep(
  currentGlucose: number,
  diabetes: string,
  insulinDose: number = 0,
  insulinLag1: number = 0, // dose given last hour
): number {
  const hasDiabetes = diabetes !== "No Diabetes";
  // Natural hepatic glucose production (higher in T2DM/T1DM)
  const naturalDrift = hasDiabetes ? STRESS_DRIFT_FACTOR + Math.random() * 2 : 1.0 + Math.random() * 1.5;
  // Noise (±8 mg/dL)
  const noise = (Math.random() - 0.5) * 16;
  // Insulin effect: current dose + 40% of lag (delayed absorption)
  const insulinEffect = (insulinDose * INSULIN_EFFECT_PER_UNIT) + (insulinLag1 * 0.4 * INSULIN_EFFECT_PER_UNIT);
  const delta = naturalDrift + noise - insulinEffect;
  // Mean-reversion: gentle pull toward 160 when in moderate range
  const reversion = currentGlucose > 180
    ? -((currentGlucose - 160) * 0.04)  // slow pull down
    : currentGlucose < 100
    ? (120 - currentGlucose) * 0.05     // slow pull up
    : 0;

  const newGlucose = currentGlucose + delta + reversion;
  return Math.round(Math.max(55, Math.min(500, newGlucose)));
}

// ── Full vitals simulation ────────────────────────────────────────────────────
export function simulateVitals(
  patient: PatientData,
  insulinLags: number[],
  glucoseDeltaHistory: number[],
  timeSinceDose: number,
): { updates: Partial<PatientData>; cqlResult: CQLResult } {
  const prevGlucose = patient.currentGlucose;
  const glucoseDelta = glucoseDeltaHistory.length > 0
    ? glucoseDeltaHistory[glucoseDeltaHistory.length - 1] : 0;

  const cqlResult = runCQLFrontend(
    prevGlucose,
    glucoseDelta,
    insulinLags[0] || 0,
    patient.creatinine || 1.0,
    patient.age,
    timeSinceDose,
  );

  const g = simulateGlucoseStep(prevGlucose, patient.diabetes, cqlResult.dose, insulinLags[0] || 0);

  // Risk & status from new glucose
  let risk: PatientData["hypoglycemiaRisk"] = "Low";
  let riskPct = 3;
  if      (g < 70)  { risk = "Critical"; riskPct = 90; }
  else if (g < 90)  { risk = "High";     riskPct = 45; }
  else if (g < 110) { risk = "Moderate"; riskPct = 20; }
  else if (g < 140) { risk = "Low";      riskPct = 8; }

  let status: PatientData["status"] = "Stable";
  if      (g < 70 || g > 300) status = "Critical";
  else if (g < 90 || g > 250) status = "At Risk";
  else if (g < 110 || g > 200) status = "Monitoring";

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  const newHistory = [
    ...patient.glucoseHistory.slice(-47),
    { time: timeStr, glucose: g, insulin: cqlResult.dose > 0 ? cqlResult.dose : undefined },
  ];
  const recent = newHistory.slice(-24);
  const inRange = recent.filter(r => r.glucose >= 140 && r.glucose <= 180).length;
  const tir = recent.length > 0 ? Math.round((inRange / recent.length) * 100) : patient.timeInRange;

  return {
    cqlResult,
    updates: {
      currentGlucose:      g,
      hypoglycemiaRisk:    risk,
      hypoglycemiaRiskPct: riskPct,
      status,
      lastInsulinAction:   cqlResult.dose,
      timeInRange:         tir,
      glucoseHistory:      newHistory,
      glucoseTrend:        g > prevGlucose + 5 ? "Rising" : g < prevGlucose - 5 ? "Falling" : "Stable",
      heartRate:           Math.round(patient.heartRate + (Math.random() - 0.5) * 4),
      spo2:                Math.min(100, Math.max(88, patient.spo2 + Math.round((Math.random() - 0.5) * 2))),
      temperature:         parseFloat((patient.temperature + (Math.random() - 0.5) * 0.08).toFixed(1)),
    },
  };
}

// ── Critical patient presets for simulator ────────────────────────────────────
export interface CriticalPreset {
  id: string;
  name: string;
  description: string;
  glucose: number;
  diabetes: string;
  age: number;
  creatinine: number;
}

export const CRITICAL_PRESETS: CriticalPreset[] = [
  { id: "dka",     name: "DKA — 3.9 g/L",       description: "Acidocétose diabétique, glycémie critique", glucose: 390, diabetes: "Type 1", age: 48, creatinine: 1.8 },
  { id: "hyper",   name: "Hyperglycémie sévère", description: "Post-opératoire, T2DM non contrôlé",       glucose: 320, diabetes: "Type 2", age: 65, creatinine: 1.4 },
  { id: "moderate",name: "Hyperglycémie modérée",description: "Sepsis + T2DM, glycémie haute",            glucose: 240, diabetes: "Type 2", age: 71, creatinine: 2.1 },
  { id: "hypo",    name: "Hypoglycémie 0.6 g/L", description: "Surdosage insuline précédent",             glucose: 62,  diabetes: "Type 2", age: 78, creatinine: 1.2 },
];
