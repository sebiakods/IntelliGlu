"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePatientStore, PatientData } from "@/lib/patientStore";
import { UserPlus, ArrowLeft, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function AddPatientPage() {
  const router = useRouter();
  const { addPatient } = usePatientStore();
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    name: "", age: "", sex: "M", weight: "", height: "", icuRoom: "",
    diagnosis: "", diabetes: "Type 2",
    currentGlucose: "", heartRate: "", bloodPressure: "",
    respiratoryRate: "", spo2: "", temperature: "",
    creatinine: "", wbc: "", potassium: "",
    attending: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => { const e = {...prev}; delete e[field]; return e; });
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name required";
    if (!form.age || isNaN(+form.age) || +form.age < 1) e.age = "Valid age required";
    if (!form.currentGlucose || isNaN(+form.currentGlucose)) e.currentGlucose = "Glucose required";
    if (+form.currentGlucose < 30 || +form.currentGlucose > 600) e.currentGlucose = "Glucose must be 30–600 mg/dL";
    if (!form.diagnosis.trim()) e.diagnosis = "Diagnosis required";
    return e;
  }

  function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    const g = +form.currentGlucose;
    const risk = g < 70 ? "Critical" : g < 90 ? "High" : g < 110 ? "Moderate" : "Low";
    const riskPct = g < 70 ? 90 : g < 90 ? 45 : g < 110 ? 20 : 5;
    const status = g < 70 || g > 300 ? "Critical" : g < 90 || g > 250 ? "At Risk" : g > 180 ? "Monitoring" : "Stable";

    const patient: PatientData = {
      id: `ICU-${String(Date.now()).slice(-4)}`,
      name: form.name.trim(),
      age: +form.age,
      sex: form.sex as "M"|"F",
      weight: +form.weight || 70,
      height: +form.height || 170,
      icuRoom: form.icuRoom || "TBD",
      icuStay: 1,
      diagnosis: form.diagnosis.trim(),
      diabetes: form.diabetes,
      currentGlucose: g,
      heartRate: +form.heartRate || 80,
      bloodPressure: form.bloodPressure || "120/80",
      respiratoryRate: +form.respiratoryRate || 16,
      spo2: +form.spo2 || 97,
      temperature: +form.temperature || 37.0,
      creatinine: +form.creatinine || 1.0,
      wbc: +form.wbc || 8.0,
      potassium: +form.potassium || 4.0,
      status,
      lastInsulinAction: 0,
      timeInRange: 0,
      hypoglycemiaRisk: risk as any,
      hypoglycemiaRiskPct: riskPct,
      glucoseHistory: [{ time: new Date().toLocaleTimeString("fr-DZ"), glucose: g }],
      glucoseTrend: "Stable",
      addedAt: new Date().toISOString(),
      simulatorActive: false,
      source: "new",
    };

    addPatient(patient);
    setSubmitted(true);
    setTimeout(() => router.push("/patients"), 1800);
  }

  if (submitted) {
    return (
      <div style={{ maxWidth: 500, margin: "80px auto", textAlign: "center" }}>
        <CheckCircle size={56} color="var(--low)" style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Patient Added</h2>
        <p style={{ color: "var(--slate-400)" }}>Redirecting to patient list…</p>
      </div>
    );
  }

  const F = ({ label, field, type="text", placeholder="", required=false, hint="" }: any) => (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--slate-700)", marginBottom: 5 }}>
        {label}{required && <span style={{ color: "var(--critical)" }}>*</span>}
      </label>
      <input
        type={type}
        className="input"
        placeholder={placeholder}
        value={(form as any)[field]}
        onChange={e => set(field, e.target.value)}
        style={errors[field] ? { borderColor: "var(--critical)" } : {}}
      />
      {hint && !errors[field] && <p style={{ fontSize: 10, color: "var(--slate-400)", marginTop: 3 }}>{hint}</p>}
      {errors[field] && <p style={{ fontSize: 11, color: "var(--critical)", marginTop: 3 }}>⚠ {errors[field]}</p>}
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }} className="animate-fade">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Link href="/patients"><button className="btn btn-ghost btn-sm"><ArrowLeft size={13} /> Back</button></Link>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Add New Patient</h1>
          <p style={{ fontSize: 12, color: "var(--slate-400)" }}>Added patients are stored separately from the dataset</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Demographics */}
        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: "var(--brand)" }}>Demographics</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <F label="Full Name" field="name" required placeholder="e.g. Ahmed Mansouri" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <F label="Age" field="age" type="number" required placeholder="Years" />
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--slate-700)", marginBottom: 5 }}>Sex</label>
                <select className="input" value={form.sex} onChange={e => set("sex", e.target.value)} style={{ cursor: "pointer" }}>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <F label="Weight (kg)" field="weight" type="number" placeholder="70" />
              <F label="Height (cm)" field="height" type="number" placeholder="170" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <F label="ICU Room" field="icuRoom" placeholder="e.g. ICU-07" />
              <F label="Attending" field="attending" placeholder="Dr. Name" />
            </div>
          </div>
        </div>

        {/* Clinical */}
        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: "var(--brand)" }}>Clinical Info</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <F label="Diagnosis" field="diagnosis" required placeholder="e.g. Sepsis, ARDS, DKA" />
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--slate-700)", marginBottom: 5 }}>Diabetes</label>
              <select className="input" value={form.diabetes} onChange={e => set("diabetes", e.target.value)} style={{ cursor: "pointer" }}>
                {["No Diabetes","Type 1","Type 2","Gestational","Unknown"].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--slate-700)", marginBottom: 5 }}>
                Current Glucose (mg/dL)<span style={{ color: "var(--critical)" }}>*</span>
              </label>
              <input type="number" className="input" placeholder="e.g. 280 (= 2.8 g/L)" value={form.currentGlucose}
                onChange={e => set("currentGlucose", e.target.value)}
                style={errors.currentGlucose ? { borderColor: "var(--critical)" } : {}} />
              {form.currentGlucose && !isNaN(+form.currentGlucose) && (
                <p style={{ fontSize: 10, color: "var(--slate-400)", marginTop: 3 }}>
                  = {(+form.currentGlucose/100).toFixed(2)} g/L
                </p>
              )}
              {errors.currentGlucose && <p style={{ fontSize: 11, color: "var(--critical)", marginTop: 3 }}>⚠ {errors.currentGlucose}</p>}
            </div>
          </div>
        </div>

        {/* Vitals */}
        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: "var(--brand)" }}>Vital Signs</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <F label="Heart Rate (bpm)" field="heartRate" type="number" placeholder="80" />
            <F label="Blood Pressure" field="bloodPressure" placeholder="120/80" />
            <F label="Resp. Rate (/min)" field="respiratoryRate" type="number" placeholder="16" />
            <F label="SpO₂ (%)" field="spo2" type="number" placeholder="97" />
            <F label="Temperature (°C)" field="temperature" type="number" placeholder="37.0" />
          </div>
        </div>

        {/* Labs */}
        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: "var(--brand)" }}>Lab Values</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <F label="Creatinine (mg/dL)" field="creatinine" type="number" placeholder="1.0" />
            <F label="WBC (K/µL)" field="wbc" type="number" placeholder="8.0" />
            <F label="Potassium (mEq/L)" field="potassium" type="number" placeholder="4.0" />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
        <Link href="/patients"><button className="btn btn-secondary">Cancel</button></Link>
        <button className="btn btn-primary" onClick={handleSubmit}>
          <UserPlus size={14} /> Save Patient to New Dataset
        </button>
      </div>
    </div>
  );
}
