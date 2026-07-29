"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface GlucosePoint {
  time: string;
  glucose: number;
  insulin?: number;
}

export interface PatientData {
  id: string;
  name: string;
  age: number;
  birthDate?: string;
  sex: "M" | "F";
  weight: number;
  height: number;
  icuRoom: string;
  icuStay: number;
  diagnosis: string;
  diabetes: string;
  currentGlucose: number;
  heartRate: number;
  bloodPressure: string;
  respiratoryRate: number;
  spo2: number;
  temperature: number;
  creatinine: number;
  wbc: number;
  potassium: number;
  status: "Stable" | "Monitoring" | "At Risk" | "Critical";
  lastInsulinAction: number;
  lastInsulinTime?: string;
  timeInRange: number;
  hypoglycemiaRisk: "Low" | "Moderate" | "High" | "Critical";
  hypoglycemiaRiskPct: number;
  glucoseHistory: GlucosePoint[];
  glucoseTrend?: "Rising" | "Falling" | "Stable";
  nextCheck?: string;
  addedAt: string;
  simulatorActive: boolean;
  source?: "dataset" | "new";  // distinguish dataset vs new patients
}

interface PatientStoreContextType {
  patients: PatientData[];
  datasetPatients: PatientData[];
  newPatients: PatientData[];
  addPatient: (p: PatientData) => void;
  updatePatient: (id: string, updates: Partial<PatientData>) => void;
  removePatient: (id: string) => void;
}

const PatientStoreContext = createContext<PatientStoreContextType | null>(null);

// ─── Dataset patients (from backend dataset) ──────────────────────────────────
const DATASET_PATIENTS: PatientData[] = [
  { id: "ICU-1025", name: "John Doe",       age: 68, sex: "M", weight: 78,  height: 175, icuRoom: "ICU-12", icuStay: 3, diagnosis: "Sepsis",          diabetes: "Type 2",    currentGlucose: 178, heartRate: 88,  bloodPressure: "120/70", respiratoryRate: 18, spo2: 97, temperature: 37.1, creatinine: 1.1, wbc: 9.8,  potassium: 4.2, status: "Stable",     lastInsulinAction: 4, timeInRange: 72, hypoglycemiaRisk: "Low",      hypoglycemiaRiskPct: 4,  glucoseHistory: [], glucoseTrend: "Rising",  addedAt: "2024-01-10", simulatorActive: false, source: "dataset" },
  { id: "ICU-1008", name: "Mary Johnson",   age: 72, sex: "F", weight: 65,  height: 162, icuRoom: "ICU-08", icuStay: 1, diagnosis: "Pneumonia",        diabetes: "Type 2",    currentGlucose: 165, heartRate: 92,  bloodPressure: "130/80", respiratoryRate: 20, spo2: 95, temperature: 38.2, creatinine: 0.9, wbc: 12.4, potassium: 3.8, status: "Stable",     lastInsulinAction: 2, timeInRange: 68, hypoglycemiaRisk: "Low",      hypoglycemiaRiskPct: 6,  glucoseHistory: [], glucoseTrend: "Stable",  addedAt: "2024-01-11", simulatorActive: false, source: "dataset" },
  { id: "ICU-1017", name: "Robert Chen",    age: 61, sex: "M", weight: 82,  height: 178, icuRoom: "ICU-03", icuStay: 2, diagnosis: "Post-Operative",   diabetes: "No Diabetes", currentGlucose: 205, heartRate: 76,  bloodPressure: "145/90", respiratoryRate: 16, spo2: 98, temperature: 37.5, creatinine: 1.3, wbc: 8.1,  potassium: 4.0, status: "Monitoring", lastInsulinAction: 6, timeInRange: 45, hypoglycemiaRisk: "Moderate", hypoglycemiaRiskPct: 12, glucoseHistory: [], glucoseTrend: "Rising",  addedAt: "2024-01-11", simulatorActive: false, source: "dataset" },
  { id: "ICU-1033", name: "Fatima Ali",     age: 55, sex: "F", weight: 58,  height: 160, icuRoom: "ICU-05", icuStay: 4, diagnosis: "Sepsis",           diabetes: "Type 2",    currentGlucose: 92,  heartRate: 105, bloodPressure: "100/65", respiratoryRate: 22, spo2: 94, temperature: 38.9, creatinine: 1.8, wbc: 15.2, potassium: 3.5, status: "At Risk",    lastInsulinAction: 1, timeInRange: 84, hypoglycemiaRisk: "High",     hypoglycemiaRiskPct: 22, glucoseHistory: [], glucoseTrend: "Falling", addedAt: "2024-01-12", simulatorActive: false, source: "dataset" },
  { id: "ICU-0999", name: "David Brown",    age: 74, sex: "M", weight: 90,  height: 180, icuRoom: "ICU-01", icuStay: 5, diagnosis: "ARDS",             diabetes: "Type 2",    currentGlucose: 248, heartRate: 98,  bloodPressure: "155/95", respiratoryRate: 28, spo2: 91, temperature: 37.8, creatinine: 2.1, wbc: 11.3, potassium: 4.8, status: "At Risk",    lastInsulinAction: 8, timeInRange: 38, hypoglycemiaRisk: "High",     hypoglycemiaRiskPct: 28, glucoseHistory: [], glucoseTrend: "Rising",  addedAt: "2024-01-13", simulatorActive: false, source: "dataset" },
  { id: "ICU-1044", name: "Emma Wilson",    age: 47, sex: "F", weight: 63,  height: 168, icuRoom: "ICU-09", icuStay: 1, diagnosis: "Stroke",           diabetes: "No Diabetes", currentGlucose: 134, heartRate: 80,  bloodPressure: "125/75", respiratoryRate: 16, spo2: 99, temperature: 36.8, creatinine: 0.8, wbc: 7.2,  potassium: 4.1, status: "Stable",     lastInsulinAction: 3, timeInRange: 76, hypoglycemiaRisk: "Low",      hypoglycemiaRiskPct: 5,  glucoseHistory: [], glucoseTrend: "Stable",  addedAt: "2024-01-14", simulatorActive: false, source: "dataset" },
  { id: "ICU-0855", name: "Ahmed Mansouri", age: 63, sex: "M", weight: 72,  height: 172, icuRoom: "ICU-02", icuStay: 2, diagnosis: "DKA",              diabetes: "Type 1",    currentGlucose: 390, heartRate: 110, bloodPressure: "100/60", respiratoryRate: 26, spo2: 96, temperature: 37.3, creatinine: 1.6, wbc: 13.5, potassium: 5.1, status: "Critical",   lastInsulinAction: 0, timeInRange: 12, hypoglycemiaRisk: "Low",      hypoglycemiaRiskPct: 2,  glucoseHistory: [], glucoseTrend: "Rising",  addedAt: "2024-01-15", simulatorActive: false, source: "dataset" },
  { id: "ICU-0920", name: "Lin Wei",        age: 58, sex: "F", weight: 60,  height: 158, icuRoom: "ICU-04", icuStay: 3, diagnosis: "Cardiac Surgery",  diabetes: "Type 2",    currentGlucose: 320, heartRate: 95,  bloodPressure: "135/85", respiratoryRate: 20, spo2: 97, temperature: 37.0, creatinine: 1.2, wbc: 9.0,  potassium: 4.3, status: "Critical",   lastInsulinAction: 0, timeInRange: 25, hypoglycemiaRisk: "Low",      hypoglycemiaRiskPct: 3,  glucoseHistory: [], glucoseTrend: "Rising",  addedAt: "2024-01-15", simulatorActive: false, source: "dataset" },
];

// Separate store for new patients added by clinicians
const NEW_PATIENTS_KEY = "intelliglu_new_patients";

function loadNewPatients(): PatientData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(NEW_PATIENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveNewPatients(patients: PatientData[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NEW_PATIENTS_KEY, JSON.stringify(patients));
  } catch { /* ignore */ }
}

export function PatientStoreProvider({ children }: { children: ReactNode }) {
  const [datasetPatients] = useState<PatientData[]>(DATASET_PATIENTS);
  const [newPatients, setNewPatients] = useState<PatientData[]>([]);

  // Load new patients from localStorage on mount
  useEffect(() => {
    setNewPatients(loadNewPatients());
  }, []);

  const patients = [...datasetPatients, ...newPatients];

  const addPatient = (p: PatientData) => {
    const updated = [...newPatients, { ...p, source: "new" as const }];
    setNewPatients(updated);
    saveNewPatients(updated);
  };

  const updatePatient = (id: string, updates: Partial<PatientData>) => {
    // Update in-memory for both stores
    // Dataset patients: update in-place (state only, not persisted)
    setNewPatients(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      saveNewPatients(updated);
      return updated;
    });
  };

  const removePatient = (id: string) => {
    // Only allow removing new patients
    const updated = newPatients.filter(p => p.id !== id);
    setNewPatients(updated);
    saveNewPatients(updated);
  };

  return (
    <PatientStoreContext.Provider value={{ patients, datasetPatients, newPatients, addPatient, updatePatient, removePatient }}>
      {children}
    </PatientStoreContext.Provider>
  );
}

export function usePatientStore() {
  const ctx = useContext(PatientStoreContext);
  if (!ctx) throw new Error("usePatientStore must be used within PatientStoreProvider");
  return ctx;
}
