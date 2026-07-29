"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { usePatientStore } from "@/lib/patientStore";
import {
  simulateVitals, runCQLFrontend, CQLResult,
  ACTION_LABELS, ACTION_DOSES, CRITICAL_PRESETS, CriticalPreset,
} from "@/lib/simulator";
import {
  Play, Square, Send, Brain, ShieldAlert, Activity,
  TrendingDown, TrendingUp, Minus, AlertTriangle, CheckCircle, Zap,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell,
} from "recharts";
import Link from "next/link";

const SPEED_OPTIONS = [
  { label: "Rapide (2s/heure)",   value: 2000 },
  { label: "Normal (8s/heure)",   value: 8000 },
  { label: "Lent (20s/heure)",    value: 20000 },
];
const ACTION_COLORS = ["#94a3b8","#22c55e","#84cc16","#eab308","#f97316","#ef4444"];

function glucoseColor(g: number) {
  if (g < 70)  return "#ef4444";
  if (g > 300) return "#7c3aed";
  if (g > 250) return "#f97316";
  if (g > 180) return "#eab308";
  if (g >= 140) return "#22c55e";
  return "#f59e0b";
}
function GlucoseLabel({ g }: { g: number }) {
  const [text, cls] =
    g < 70  ? ["HYPOGLYCÉMIE 🚨", "badge-critical"] :
    g > 300 ? ["HYPER SÉVÈRE ⚠️", "badge-critical"] :
    g > 250 ? ["HYPER ÉLEVÉE",    "badge-high"] :
    g > 180 ? ["AU-DESSUS CIBLE", "badge-moderate"] :
    g >= 140 ? ["CIBLE ✓",        "badge-low"] :
               ["EN-DESSOUS CIBLE","badge-moderate"];
  return <span className={`badge ${cls}`}>{text}</span>;
}

function TrendArrow({ g, prev }: { g: number; prev: number }) {
  const delta = g - prev;
  if (delta > 8)  return <span style={{ color: "#ef4444" }}>↗ +{delta.toFixed(0)}</span>;
  if (delta < -8) return <span style={{ color: "#22c55e" }}>↘ {delta.toFixed(0)}</span>;
  return <span style={{ color: "#94a3b8" }}>→ {delta >= 0 ? "+" : ""}{delta.toFixed(0)}</span>;
}

// ── Patient critique par défaut pour le simulateur ────────────────────────────
const DEFAULT_CRITICAL = {
  id: "SIM-001",
  name: "Ahmed Mansouri",
  age: 55,
  sex: "M" as const,
  weight: 74,
  height: 174,
  icuRoom: "SIM",
  icuStay: 1,
  diagnosis: "DKA — Acidocétose diabétique",
  diabetes: "Type 1",
  currentGlucose: 390,
  heartRate: 112,
  bloodPressure: "98/62",
  respiratoryRate: 26,
  spo2: 96,
  temperature: 37.4,
  creatinine: 1.7,
  wbc: 13.8,
  potassium: 5.2,
  status: "Critical" as const,
  lastInsulinAction: 0,
  lastInsulinTime: undefined,
  timeInRange: 5,
  hypoglycemiaRisk: "Low" as const,
  hypoglycemiaRiskPct: 2,
  glucoseHistory: [] as any[],
  glucoseTrend: "Rising" as const,
  addedAt: new Date().toISOString(),
  simulatorActive: false,
  source: "dataset" as const,
};

export default function SimulatorPage() {
  const { patients, updatePatient } = usePatientStore();
  const searchParams = useSearchParams();
  const preselect = searchParams.get("patient");

  // Mode: "patient" = real patient, "preset" = critical scenario
  const [mode,       setMode]       = useState<"preset"|"patient">("preset");
  const [presetIdx,  setPresetIdx]  = useState(0);
  const [patientId,  setPatientId]  = useState(preselect || patients[0]?.id || "");
  const [simPatient, setSimPatient] = useState<typeof DEFAULT_CRITICAL>({ ...DEFAULT_CRITICAL });

  const [running,        setRunning]        = useState(false);
  const [speed,          setSpeed]          = useState(2000);
  const [simHour,        setSimHour]        = useState(0);
  const [insulinLags,    setInsulinLags]    = useState<number[]>([0,0,0]);
  const [glucoseDeltaHist,setGlucoseDeltaHist] = useState<number[]>([0]);
  const [timeSinceDose,  setTimeSinceDose]  = useState(1.0);
  const [chartData,      setChartData]      = useState<any[]>([]);
  const [lastCQL,        setLastCQL]        = useState<CQLResult | null>(null);
  const [prevGlucose,    setPrevGlucose]    = useState(390);
  const [log,            setLog]            = useState<{ time: string; msg: string; type: "ok"|"warn"|"crit" }[]>([]);
  const [handoffSent,    setHandoffSent]    = useState(false);
  const [stabilized,     setStabilized]     = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset simulation when mode/preset/patient changes
  const resetSim = useCallback((glucose: number) => {
    setRunning(false);
    setSimHour(0);
    setInsulinsLagsReset();
    setGlucoseDeltaHist([0]);
    setTimeSinceDose(1.0);
    setChartData([]);
    setLastCQL(null);
    setPrevGlucose(glucose);
    setLog([]);
    setHandoffSent(false);
    setStabilized(false);
  }, []);

  function setInsulinsLagsReset() { setInsulinLags([0,0,0]); }

  // Apply preset
  function applyPreset(idx: number) {
    const preset = CRITICAL_PRESETS[idx];
    setSimPatient(prev => ({
      ...prev,
      currentGlucose:   preset.glucose,
      diabetes:         preset.diabetes,
      age:              preset.age,
      creatinine:       preset.creatinine,
      diagnosis:        preset.description,
      status:           preset.glucose < 70 ? "At Risk" : preset.glucose > 250 ? "Critical" : "Monitoring",
      glucoseHistory:   [],
    }));
    resetSim(preset.glucose);
  }
  useEffect(() => { applyPreset(presetIdx); }, [presetIdx]);

  // Get current simulated patient
  const p = mode === "preset"
    ? simPatient
    : (patients.find(x => x.id === patientId) || patients[0]);

  const currentGlucose = (p as any)?.currentGlucose ?? 180;

  // ── Simulation step ──────────────────────────────────────────────────────────
  const doStep = useCallback(() => {
    if (!p) return;

    const glucoseDelta = glucoseDeltaHist[glucoseDeltaHist.length - 1] ?? 0;
    const cqlResult = runCQLFrontend(
      (p as any).currentGlucose,
      glucoseDelta,
      insulinLags[0] || 0,
      (p as any).creatinine || 1.0,
      (p as any).age,
      timeSinceDose,
    );

    // Realistic glucose step
    const { updates } = simulateVitals(
      p as any,
      insulinLags,
      glucoseDeltaHist,
      timeSinceDose,
    );

    const g     = updates.currentGlucose!;
    const gPrev = (p as any).currentGlucose;

    // Update patient
    if (mode === "preset") {
      setSimPatient(prev => ({
        ...prev,
        currentGlucose:  g,
        status:          (updates.status as any) || prev.status,
        glucoseHistory:  updates.glucoseHistory as any || prev.glucoseHistory,
        lastInsulinAction: cqlResult.dose,
      }));
    } else {
      updatePatient(patientId, updates);
    }

    setLastCQL(cqlResult);
    setPrevGlucose(gPrev);
    setSimHour(h => h + 1);
    setInsulinLags(prev => [cqlResult.dose, prev[0], prev[1]]);
    setGlucoseDeltaHist(prev => [...prev.slice(-23), g - gPrev]);
    setTimeSinceDose(cqlResult.dose > 0 ? 0 : Math.min(1, timeSinceDose + 1/24));

    // Chart data
    setChartData(prev => [...prev.slice(-59), {
      h:      simHour + 1,
      g,
      dose:   cqlResult.dose,
      action: cqlResult.action,
    }]);

    // Detect stabilisation (3 consecutive hours in target 140-180)
    setChartData(prev => {
      const recent3 = prev.slice(-3);
      if (recent3.length >= 3 && recent3.every(d => d.g >= 140 && d.g <= 180)) {
        setStabilized(true);
      }
      return prev;
    });

    // Log
    const now = new Date().toLocaleTimeString("fr-DZ", { hour: "2-digit", minute: "2-digit" });
    let msg = `H+${simHour+1} | ${g} mg/dL (${(g/100).toFixed(1)} g/L) → ${cqlResult.label}`;
    let type: "ok"|"warn"|"crit" = "ok";
    if (g < 70)           { msg += " 🚨 HYPOGLYCÉMIE!"; type = "crit"; }
    else if (g > 300)     { msg += " ⚠ HYPER SÉVÈRE";   type = "crit"; }
    else if (g > 180)     { msg += " — Au-dessus cible"; type = "warn"; }
    else if (g >= 140)    { msg += " ✓ Cible atteinte";  type = "ok"; }
    if (cqlResult.safetyAdjusted) msg += " 🛡 Override sécurité";
    setLog(l => [{ time: now, msg, type }, ...l.slice(0, 29)]);
  }, [p, insulinLags, glucoseDeltaHist, timeSinceDose, simHour, mode, patientId]);

  useEffect(() => {
    if (running) { intervalRef.current = setInterval(doStep, speed); }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, doStep, speed]);

  function handleToggle() {
    if (!running) {
      resetSim((p as any)?.currentGlucose || 180);
      setTimeout(() => {
        setLog([{ time: new Date().toLocaleTimeString("fr-DZ"), msg: "▶ Simulation CQL démarrée", type: "ok" }]);
        setRunning(true);
      }, 50);
    } else {
      setRunning(false);
    }
  }

  function handleSendRec() {
    if (!lastCQL) return;
    const handoff = {
      patientId: mode === "preset" ? simPatient.id : patientId,
      dose: lastCQL.dose, label: lastCQL.label, confidence: lastCQL.confidence,
      qValues: lastCQL.qValues, safetyAdjusted: lastCQL.safetyAdjusted,
      safetyWarnings: lastCQL.safetyWarnings, action: lastCQL.action, probabilities: lastCQL.probabilities,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem("intelliglu_sim_handoff", JSON.stringify(handoff));
    window.dispatchEvent(new StorageEvent("storage", { key: "intelliglu_sim_handoff" }));
    setHandoffSent(true);
  }

  const qChartData = lastCQL
    ? lastCQL.qValues.map((q, i) => ({ a: i, q, label: ACTION_LABELS[i] }))
    : [];

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }} className="animate-fade">
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Simulateur CQL</h1>
        <p style={{ fontSize: 12, color: "var(--slate-400)", marginTop: 2 }}>
          Simulation physiologique réaliste — Patient critique → Stabilisation par CQL
        </p>
      </div>

      {/* Controls row */}
      <div className="card" style={{ padding: "12px 16px", marginBottom: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        {/* Mode selector */}
        <div style={{ display: "flex", gap: 1, background: "var(--slate-100)", borderRadius: 8, padding: 2 }}>
          {(["preset","patient"] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); if (m==="preset") applyPreset(presetIdx); }}
              style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "none",
                cursor: "pointer", background: mode === m ? "white" : "transparent",
                color: mode === m ? "var(--brand)" : "var(--slate-500)",
                boxShadow: mode === m ? "var(--shadow-sm)" : "none" }}>
              {m === "preset" ? "Scénario critique" : "Patient réel"}
            </button>
          ))}
        </div>

        {/* Preset or patient selector */}
        {mode === "preset" ? (
          <select className="input" value={presetIdx} onChange={e => setPresetIdx(Number(e.target.value))}
            style={{ width: 240, height: 34 }}>
            {CRITICAL_PRESETS.map((p, i) => <option key={p.id} value={i}>{p.name}</option>)}
          </select>
        ) : (
          <select className="input" value={patientId} onChange={e => { setPatientId(e.target.value); setRunning(false); }}
            style={{ width: 240, height: 34 }}>
            {patients.map(pt => <option key={pt.id} value={pt.id}>{pt.id} — {pt.name} ({pt.currentGlucose} mg/dL)</option>)}
          </select>
        )}

        <select className="input" value={speed} onChange={e => setSpeed(Number(e.target.value))} style={{ width: 180, height: 34 }}>
          {SPEED_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <button className={`btn ${running ? "btn-danger" : "btn-primary"}`} onClick={handleToggle}>
          {running ? <><Square size={13} /> Arrêter</> : <><Play size={13} /> Démarrer</>}
        </button>

        {running && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--low)" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--low)", animation: "pulse 1s infinite" }} />
            <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--font-mono)" }}>Heure {simHour}</span>
          </div>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {lastCQL && !handoffSent && (
            <Link href={`/recommendations?patient=${mode === "preset" ? simPatient.id : patientId}`}>
              <button className="btn btn-secondary btn-sm" onClick={handleSendRec}>
                <Send size={12} /> Envoyer aux Recommandations
              </button>
            </Link>
          )}
          {handoffSent && <span className="badge badge-low">✓ Envoyé</span>}
        </div>
      </div>

      {/* Stabilisation banner */}
      {stabilized && (
        <div style={{
          background: "var(--low-bg)", border: "1.5px solid var(--low)",
          borderRadius: 12, padding: "12px 18px", marginBottom: 14,
          display: "flex", alignItems: "center", gap: 10
        }}>
          <CheckCircle size={18} color="var(--low)" />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--low)" }}>Patient stabilisé 🎯</p>
            <p style={{ fontSize: 11, color: "var(--low)" }}>La politique CQL a ramené la glycémie dans la cible (140–180 mg/dL) en {simHour} heures.</p>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 14 }}>
        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Patient vitals banner */}
          {p && (
            <div className="card" style={{ padding: "12px 18px", display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14 }}>{(p as any).name}</p>
                <p style={{ fontSize: 11, color: "var(--slate-400)" }}>{(p as any).diagnosis}</p>
              </div>
              {[
                { label: "Glycémie",    value: `${currentGlucose} mg/dL`,     sub: `${(currentGlucose/100).toFixed(2)} g/L`, color: glucoseColor(currentGlucose) },
                { label: "Tendance",    value: <TrendArrow g={currentGlucose} prev={prevGlucose} />, color: "var(--slate-700)" },
                { label: "Diabète",     value: (p as any).diabetes,            color: "var(--slate-700)" },
                { label: "Âge",         value: `${(p as any).age} ans`,         color: "var(--slate-700)" },
                { label: "Dernière dose", value: `${(p as any).lastInsulinAction}U`, color: "var(--brand)" },
              ].map((v, i) => (
                <div key={i} style={{ borderLeft: "1px solid var(--slate-100)", paddingLeft: 16 }}>
                  <p style={{ fontSize: 10, color: "var(--slate-400)" }}>{v.label}</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: typeof v.color === "string" ? v.color : undefined, fontFamily: "var(--font-mono)" }}>
                    {typeof v.value === "string" ? v.value : v.value}
                  </p>
                  {(v as any).sub && <p style={{ fontSize: 10, color: "var(--slate-400)" }}>{(v as any).sub}</p>}
                </div>
              ))}
              <div style={{ marginLeft: "auto" }}>
                <GlucoseLabel g={currentGlucose} />
              </div>
            </div>
          )}

          {/* Glucose chart */}
          <div className="card" style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600 }}>Glycémie & Insuline — Simulation temps réel</p>
                <p style={{ fontSize: 11, color: "var(--slate-400)" }}>{simHour} heures simulées · Zone cible 140–180 mg/dL</p>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {[
                  { color: "#ef4444", label: "Hypo <70" },
                  { color: "#22c55e", label: "Cible 140-180" },
                  { color: "#eab308", label: "Haut >180" },
                  { color: "#7c3aed", label: "Dose insuline" },
                ].map(l => (
                  <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 12, height: 2.5, background: l.color, borderRadius: 2 }} />
                    <span style={{ fontSize: 10, color: "var(--slate-400)" }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--slate-100)" />
                  <XAxis dataKey="h" tick={{ fontSize: 9, fill: "var(--slate-400)" }} axisLine={false} tickLine={false} label={{ value: "Heure", position: "insideBottom", offset: -2, fontSize: 10, fill: "var(--slate-400)" }} />
                  <YAxis tick={{ fontSize: 9, fill: "var(--slate-400)" }} axisLine={false} tickLine={false} domain={[50, 450]} />
                  <ReferenceLine y={70}  stroke="#ef4444" strokeDasharray="4 3" strokeOpacity={0.7} label={{ value: "70", position: "left", fontSize: 9, fill: "#ef4444" }} />
                  <ReferenceLine y={140} stroke="#22c55e" strokeDasharray="4 3" strokeOpacity={0.5} label={{ value: "140", position: "left", fontSize: 9, fill: "#22c55e" }} />
                  <ReferenceLine y={180} stroke="#eab308" strokeDasharray="4 3" strokeOpacity={0.5} label={{ value: "180", position: "left", fontSize: 9, fill: "#eab308" }} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, background: "white", border: "1px solid var(--slate-200)" }}
                    formatter={(v: any, name: string) =>
                      name === "g" ? [`${v} mg/dL (${(v/100).toFixed(2)} g/L)`, "Glycémie"] : [`${v}U`, "Dose CQL"]
                    }
                    labelFormatter={(l: any) => `Heure ${l}`}
                  />
                  <Line dataKey="g" stroke="var(--brand)" strokeWidth={2.5} dot={false} name="g" />
                  <Line dataKey="dose" stroke="#7c3aed" strokeWidth={1.5} dot={{ r: 3, fill: "#7c3aed" }} strokeDasharray="5 2" name="dose" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 210, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--slate-400)", gap: 8 }}>
                <Activity size={36} style={{ opacity: 0.2 }} />
                <p style={{ fontSize: 13 }}>Démarrer la simulation pour voir les données en temps réel</p>
                <p style={{ fontSize: 11 }}>Le patient critique commencera à {currentGlucose} mg/dL ({(currentGlucose/100).toFixed(2)} g/L)</p>
              </div>
            )}
          </div>

          {/* Log */}
          <div className="card" style={{ padding: "14px 16px" }}>
            <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Journal de simulation</p>
            <div style={{ maxHeight: 190, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
              {log.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--slate-400)", textAlign: "center", padding: "20px 0" }}>Aucun événement</p>
              ) : log.map((e, i) => (
                <div key={i} style={{
                  display: "flex", gap: 8, padding: "5px 8px", borderRadius: 6,
                  background: e.type === "crit" ? "#fef2f2" : e.type === "warn" ? "#fff7ed" : "transparent",
                  borderLeft: `3px solid ${e.type === "crit" ? "#dc2626" : e.type === "warn" ? "#ea580c" : "#e2e8f0"}`,
                }}>
                  <span style={{ fontSize: 10, color: "var(--slate-400)", fontFamily: "var(--font-mono)", flexShrink: 0, paddingTop: 1 }}>{e.time}</span>
                  <span style={{ fontSize: 11, color: e.type === "crit" ? "#dc2626" : e.type === "warn" ? "#ea580c" : "var(--slate-600)" }}>{e.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — CQL panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* CQL Decision */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 600 }}>Décision CQL</p>
              <span className="badge badge-brand"><Brain size={10} /> RL Actif</span>
            </div>
            {lastCQL ? (
              <>
                <div style={{ textAlign: "center", marginBottom: 12 }}>
                  <p style={{ fontSize: 10, color: "var(--slate-400)", marginBottom: 4 }}>Dose recommandée</p>
                  <p style={{ fontSize: 48, fontWeight: 800, color: ACTION_COLORS[lastCQL.action], fontFamily: "var(--font-mono)", lineHeight: 1 }}>
                    {lastCQL.dose}U
                  </p>
                  <p style={{ fontSize: 12, color: "var(--slate-600)", marginTop: 5 }}>{lastCQL.label}</p>
                  <div style={{ margin: "10px 10px 0" }}>
                    <div style={{ background: "var(--slate-100)", borderRadius: 99, height: 6, overflow: "hidden" }}>
                      <div style={{
                        width: `${(lastCQL.confidence * 100).toFixed(0)}%`, height: "100%", borderRadius: 99,
                        background: lastCQL.confidence > 0.65 ? "var(--low)" : lastCQL.confidence > 0.4 ? "var(--moderate)" : "var(--high)",
                        transition: "width 0.5s ease"
                      }} />
                    </div>
                    <p style={{ fontSize: 10, color: "var(--slate-500)", marginTop: 4 }}>
                      Confiance: <strong style={{ fontFamily: "var(--font-mono)" }}>{(lastCQL.confidence * 100).toFixed(0)}%</strong>
                    </p>
                  </div>
                </div>

                {lastCQL.safetyWarnings.length > 0 && (
                  <div style={{ background: "var(--high-bg)", border: "1px solid var(--high)", borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
                    <div style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 3 }}>
                      <ShieldAlert size={11} color="var(--high)" />
                      <p style={{ fontSize: 10, fontWeight: 700, color: "var(--high)" }}>Override Sécurité</p>
                    </div>
                    {lastCQL.safetyWarnings.map((w,i) => (
                      <p key={i} style={{ fontSize: 10, color: "var(--high)", paddingLeft: 16 }}>{w}</p>
                    ))}
                  </div>
                )}

                <Link href={`/recommendations?patient=${mode === "preset" ? simPatient.id : patientId}`} style={{ display: "block" }}>
                  <button className="btn btn-primary btn-sm" style={{ width: "100%" }} onClick={handleSendRec}>
                    <Send size={12} /> Envoyer aux Recommandations
                  </button>
                </Link>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--slate-400)" }}>
                <Brain size={32} style={{ opacity: 0.2, marginBottom: 8 }} />
                <p style={{ fontSize: 12 }}>Démarrer pour voir les décisions CQL</p>
              </div>
            )}
          </div>

          {/* Q-values */}
          {lastCQL && (
            <div className="card" style={{ padding: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Q-Values par action</p>
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={qChartData} margin={{ top: 2, right: 2, left: -30, bottom: 0 }} barSize={18}>
                  <XAxis dataKey="a" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={false} axisLine={false} />
                  <Tooltip formatter={(v: any, _: any, p: any) => [`Q: ${Number(v).toFixed(3)}`, p.payload.label]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="q" radius={[3,3,0,0]}>
                    {qChartData.map((_,i) => (
                      <Cell key={i} fill={i === lastCQL.action ? ACTION_COLORS[i] : `${ACTION_COLORS[i]}50`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 8 }}>
                {qChartData.map(a => (
                  <div key={a.a} style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "3px 6px", borderRadius: 6,
                    background: a.a === lastCQL.action ? "var(--brand-light)" : "transparent"
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: 2, background: ACTION_COLORS[a.a], flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 10, fontWeight: a.a === lastCQL.action ? 700 : 400, color: a.a === lastCQL.action ? "var(--brand)" : "var(--slate-600)" }}>
                      {ACTION_LABELS[a.a]}
                    </span>
                    <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--slate-400)" }}>{a.q.toFixed(3)}</span>
                    {a.a === lastCQL.action && <span style={{ fontSize: 10, color: "var(--brand)", fontWeight: 700 }}>★</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats card */}
          {chartData.length > 2 && (
            <div className="card" style={{ padding: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Statistiques</p>
              {(() => {
                const gs = chartData.map(d => d.g);
                const inRange = gs.filter(g => g >= 140 && g <= 180).length;
                const totalInsulin = chartData.reduce((s,d) => s + d.dose, 0);
                return (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      { label: "Moy glycémie", value: `${Math.round(gs.reduce((a,b)=>a+b,0)/gs.length)} mg/dL` },
                      { label: "Cible atteinte", value: `${Math.round(inRange/gs.length*100)}%` },
                      { label: "Min / Max", value: `${Math.min(...gs)} / ${Math.max(...gs)}` },
                      { label: "Insuline totale", value: `${totalInsulin.toFixed(1)}U` },
                    ].map(s => (
                      <div key={s.label} style={{ background: "var(--slate-50)", borderRadius: 8, padding: "8px 10px" }}>
                        <p style={{ fontSize: 10, color: "var(--slate-400)" }}>{s.label}</p>
                        <p style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--slate-900)" }}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
