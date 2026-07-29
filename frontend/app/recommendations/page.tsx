"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { usePatientStore, PatientData } from "@/lib/patientStore";
import { runCQLFrontend, ACTION_LABELS, ACTION_DOSES } from "@/lib/simulator";
import {
  CheckCircle, AlertTriangle, Brain, Activity, ChevronRight,
  BarChart2, Shield, Zap, User, Check, Edit3, RefreshCw
} from "lucide-react";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Link from "next/link";

type RecResult = {
  dose: number; label: string; confidence: number;
  qValues: number[]; safetyAdjusted: boolean; safetyWarnings: string[];
  action: number; probabilities: number[];
};

function glucoseColor(g: number) {
  if (g < 70) return "var(--critical)";
  if (g > 300) return "#7C3AED";
  if (g > 180) return "var(--high)";
  if (g >= 140) return "var(--low)";
  return "var(--moderate)";
}

const ACTION_COLORS = ["#94a3b8", "#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444"];

export default function RecommendationsPage() {
  const { patients } = usePatientStore();
  const searchParams = useSearchParams();
  const preselect = searchParams.get("patient");

  const [selId, setSelId] = useState(preselect || patients[0]?.id || "");
  const [rec, setRec] = useState<RecResult | null>(null);
  const [mode, setMode] = useState<"pending" | "accepted" | "manual">("pending");
  const [manualDose, setManualDose] = useState<number>(0);
  const [applied, setApplied] = useState<{ dose: number; override: boolean } | null>(null);
  const [simResult, setSimResult] = useState<RecResult | null>(null); // result from simulator handoff

  const p = patients.find(x => x.id === selId) || patients[0];

  const computeRec = useCallback((patient: PatientData) => {
    const r = runCQLFrontend(patient.currentGlucose, 0, patient.lastInsulinAction, patient.creatinine, patient.age);
    setRec(r);
    setMode("pending");
    setApplied(null);
    setSimResult(null);
  }, []);

  useEffect(() => {
    if (p) { computeRec(p); setManualDose(p.lastInsulinAction); }
  }, [p?.id, p?.currentGlucose]);

  // Listen for simulator handoff via localStorage events
  useEffect(() => {
    const handler = () => {
      const raw = localStorage.getItem("intelliglu_sim_handoff");
      if (!raw) return;
      try {
        const data = JSON.parse(raw);
        if (data.patientId === selId) {
          const r: RecResult = {
            dose: data.dose, label: data.label, confidence: data.confidence,
            qValues: data.qValues, safetyAdjusted: data.safetyAdjusted,
            safetyWarnings: data.safetyWarnings, action: data.action, probabilities: data.probabilities,
          };
          setSimResult(r);
          setRec(r);
          setMode("pending");
        }
      } catch {}
    };
    window.addEventListener("storage", handler);
    handler(); // check on mount
    return () => window.removeEventListener("storage", handler);
  }, [selId]);

  function handleAccept() {
    if (!rec) return;
    setApplied({ dose: rec.dose, override: false });
    setMode("accepted");
  }

  function handleManual() {
    setApplied({ dose: manualDose, override: true });
    setMode("manual");
  }

  const allActions = rec ? Object.entries(ACTION_DOSES).map(([i, dose]) => ({
    action: parseInt(i), dose, label: ACTION_LABELS[parseInt(i)],
    q: rec.qValues[parseInt(i)], prob: rec.probabilities[parseInt(i)],
    active: parseInt(i) === rec.action
  })) : [];

  if (!p) return <div>No patients</div>;

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }} className="animate-fade">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>AI Recommendations</h1>
        <p style={{ fontSize: 12, color: "var(--slate-400)", marginTop: 2 }}>
          CQL Offline Reinforcement Learning · Evidence-based insulin dosing
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
        {/* Patient list */}
        <div className="card" style={{ padding: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: "var(--slate-400)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            Patients ({patients.length})
          </p>
          {patients.map(pt => {
            const pr = pt.hypoglycemiaRisk;
            const color = pr === "Critical" || pr === "High" ? "var(--critical)" : pr === "Moderate" ? "var(--moderate)" : "var(--low)";
            return (
              <button key={pt.id} onClick={() => setSelId(pt.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 8,
                  padding: "9px 10px", borderRadius: 8, marginBottom: 3, cursor: "pointer",
                  border: selId === pt.id ? "2px solid var(--brand)" : "1px solid transparent",
                  background: selId === pt.id ? "var(--brand-light)" : "transparent", textAlign: "left"
                }}>
                <span className={`status-dot ${pt.status === "Critical" ? "critical" : pt.status === "At Risk" ? "high" : pt.status === "Monitoring" ? "moderate" : "stable"}`} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700 }}>{pt.id}</p>
                  <p style={{ fontSize: 10, color: "var(--slate-400)" }}>{pt.name}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: glucoseColor(pt.currentGlucose), fontFamily: "var(--font-mono)" }}>{pt.currentGlucose}</p>
                  <p style={{ fontSize: 9, color: "var(--slate-400)" }}>{(pt.currentGlucose/100).toFixed(1)} g/L</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Main content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Simulator handoff banner */}
          {simResult && (
            <div style={{ background: "var(--brand-light)", border: "1.5px solid var(--brand)", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <Activity size={16} color="var(--brand)" />
              <p style={{ fontSize: 13, color: "var(--brand)", fontWeight: 600, flex: 1 }}>
                Simulator result received for {p.id} — CQL recommends <strong>{simResult.label}</strong>
              </p>
              <button className="btn btn-secondary btn-sm" onClick={() => setSimResult(null)}>Dismiss</button>
            </div>
          )}

          {/* Patient header + stats */}
          <div className="card" style={{ padding: "14px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700 }}>{p.name} <span style={{ fontSize: 12, color: "var(--slate-400)", fontWeight: 400 }}>— {p.id}</span></p>
                <p style={{ fontSize: 12, color: "var(--slate-400)" }}>{p.sex === "M" ? "Male" : "Female"}, {p.age}y · {p.weight}kg · ICU Stay: Day {p.icuStay} · {p.diagnosis}</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span className={`badge ${p.status === "Critical" ? "badge-critical" : p.status === "At Risk" ? "badge-high" : p.status === "Monitoring" ? "badge-info" : "badge-low"}`}>{p.status}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => computeRec(p)}><RefreshCw size={12} /> Refresh</button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              {[
                { label: "Glucose", value: `${p.currentGlucose} mg/dL`, sub: `${(p.currentGlucose/100).toFixed(1)} g/L`, color: glucoseColor(p.currentGlucose) },
                { label: "Trend", value: p.glucoseTrend === "Rising" ? "↗ Rising" : p.glucoseTrend === "Falling" ? "↘ Falling" : "→ Stable", sub: "24h trend", color: p.glucoseTrend === "Rising" ? "var(--high)" : "var(--low)" },
                { label: "Time in Range", value: `${p.timeInRange}%`, sub: "Last 24h", color: "var(--low)" },
                { label: "Hypo Risk", value: `${p.hypoglycemiaRisk}`, sub: `${p.hypoglycemiaRiskPct}%`, color: p.hypoglycemiaRiskPct > 20 ? "var(--critical)" : "var(--slate-700)" },
                { label: "Diabetes", value: p.diabetes, sub: "", color: "var(--slate-700)" },
              ].map(s => (
                <div key={s.label} style={{ borderLeft: "1px solid var(--slate-100)", paddingLeft: 14 }}>
                  <p style={{ fontSize: 10, color: "var(--slate-400)" }}>{s.label}</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</p>
                  {s.sub && <p style={{ fontSize: 10, color: "var(--slate-400)" }}>{s.sub}</p>}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* CQL Recommendation card */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600 }}>CQL Recommendation</p>
                <span className="badge badge-brand"><Brain size={10} /> Offline RL</span>
              </div>

              {rec && (
                <>
                  {/* Applied result */}
                  {applied && (
                    <div style={{
                      background: applied.override ? "var(--moderate-bg)" : "var(--low-bg)",
                      border: `1.5px solid ${applied.override ? "var(--moderate)" : "var(--low)"}`,
                      borderRadius: 10, padding: "10px 14px", marginBottom: 14,
                      display: "flex", alignItems: "center", gap: 8
                    }}>
                      <CheckCircle size={14} color={applied.override ? "var(--moderate)" : "var(--low)"} />
                      <p style={{ fontSize: 13, fontWeight: 600, color: applied.override ? "var(--moderate)" : "var(--low)" }}>
                        {applied.override ? "Manual override:" : "Accepted:"} <strong>{applied.dose}U</strong> insulin administered
                      </p>
                    </div>
                  )}

                  <div style={{ textAlign: "center", margin: "8px 0 14px" }}>
                    <p style={{ fontSize: 11, color: "var(--slate-400)", marginBottom: 4 }}>Recommended Dose</p>
                    <p style={{ fontSize: 42, fontWeight: 800, color: "var(--brand)", fontFamily: "var(--font-mono)", lineHeight: 1 }}>
                      {rec.dose}U
                    </p>
                    <p style={{ fontSize: 13, color: "var(--slate-600)", marginTop: 4 }}>{rec.label}</p>
                    <div style={{ marginTop: 10, padding: "0 20px" }}>
                      <div style={{ background: "var(--slate-100)", borderRadius: 99, height: 7 }}>
                        <div style={{ width: `${(rec.confidence * 100).toFixed(0)}%`, height: "100%", borderRadius: 99, transition: "width 0.6s", background: rec.confidence > 0.7 ? "var(--low)" : rec.confidence > 0.4 ? "var(--moderate)" : "var(--high)" }} />
                      </div>
                      <p style={{ fontSize: 11, color: "var(--slate-500)", marginTop: 5 }}>Confidence: <strong style={{ fontFamily: "var(--font-mono)" }}>{(rec.confidence * 100).toFixed(0)}%</strong></p>
                    </div>
                  </div>

                  {/* Safety warnings */}
                  {rec.safetyWarnings.length > 0 && (
                    <div style={{ background: "var(--high-bg)", border: "1px solid var(--high)", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <Shield size={12} color="var(--high)" />
                        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--high)" }}>Safety Override Applied</p>
                      </div>
                      {rec.safetyWarnings.map((w, i) => <p key={i} style={{ fontSize: 11, color: "var(--high)", paddingLeft: 18 }}>{w}</p>)}
                    </div>
                  )}

                  {/* Decision buttons */}
                  {mode === "pending" && !applied && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleAccept}>
                        <CheckCircle size={14} /> Accept — Administer {rec.dose}U
                      </button>
                      <button className="btn btn-secondary" style={{ width: "100%" }} onClick={() => setMode("manual")}>
                        <Edit3 size={14} /> Manual Override
                      </button>
                      <Link href={`/simulator?patient=${p.id}`} style={{ width: "100%" }}>
                        <button className="btn btn-ghost" style={{ width: "100%", fontSize: 12 }}>
                          <Activity size={12} /> Test in Simulator First
                        </button>
                      </Link>
                    </div>
                  )}

                  {/* Manual override input */}
                  {mode === "manual" && !applied && (
                    <div style={{ background: "var(--slate-50)", borderRadius: 10, padding: 14 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Manual Dose Override</p>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 10 }}>
                        {[0, 1, 2, 3, 4, 5, 6, 8, 10].map(d => (
                          <button key={d} onClick={() => setManualDose(d)}
                            style={{
                              padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                              border: manualDose === d ? "2px solid var(--brand)" : "1px solid var(--slate-200)",
                              background: manualDose === d ? "var(--brand-light)" : "var(--white)",
                              color: manualDose === d ? "var(--brand)" : "var(--slate-700)"
                            }}>{d}U</button>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleManual}>
                          <Check size={13} /> Apply {manualDose}U
                        </button>
                        <button className="btn btn-secondary" onClick={() => setMode("pending")}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Recompute after applied */}
                  {applied && (
                    <button className="btn btn-secondary" style={{ width: "100%", marginTop: 8 }} onClick={() => computeRec(p)}>
                      <RefreshCw size={12} /> New Recommendation
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Q-value breakdown */}
            <div className="card" style={{ padding: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Q-Value Breakdown</p>
              <p style={{ fontSize: 11, color: "var(--slate-400)", marginBottom: 14 }}>CQL policy scores for each action</p>

              {rec && (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={allActions} margin={{ top: 4, right: 4, left: -30, bottom: 0 }} barSize={22}>
                      <XAxis dataKey="action" tick={{ fontSize: 10, fill: "var(--slate-400)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={false} axisLine={false} />
                      <Tooltip
                        formatter={(v: any, name: any, props: any) => [
                          `Q: ${Number(v).toFixed(3)} · Prob: ${(props.payload.prob * 100).toFixed(0)}%`,
                          props.payload.label
                        ]}
                        contentStyle={{ fontSize: 11, borderRadius: 8 }}
                      />
                      <Bar dataKey="q" radius={[4, 4, 0, 0]}>
                        {allActions.map((a, i) => (
                          <Cell key={i} fill={a.active ? ACTION_COLORS[i] : `${ACTION_COLORS[i]}55`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 5 }}>
                    {allActions.sort((a,b) => b.q - a.q).slice(0,4).map(a => (
                      <div key={a.action} style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8,
                        background: a.active ? "var(--brand-light)" : "var(--slate-50)",
                        border: a.active ? "1px solid var(--brand)" : "1px solid transparent"
                      }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: ACTION_COLORS[a.action], flexShrink: 0 }} />
                        <p style={{ flex: 1, fontSize: 11, fontWeight: a.active ? 700 : 400, color: a.active ? "var(--brand)" : "var(--slate-700)" }}>
                          {a.label}
                        </p>
                        <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--slate-500)" }}>{a.q.toFixed(3)}</p>
                        <p style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--slate-400)" }}>{(a.prob * 100).toFixed(0)}%</p>
                        {a.active && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--brand)" }}>★</span>}
                      </div>
                    ))}
                  </div>

                  {/* Clinical explanation */}
                  <div style={{ marginTop: 14, background: "var(--slate-50)", borderRadius: 10, padding: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "var(--slate-700)", marginBottom: 4 }}>Clinical Rationale</p>
                    <p style={{ fontSize: 11, color: "var(--slate-500)", lineHeight: 1.7 }}>
                      {p.currentGlucose < 70
                        ? `Critical hypoglycemia at ${p.currentGlucose} mg/dL (${(p.currentGlucose/100).toFixed(1)} g/L). No insulin — administer glucose immediately.`
                        : p.currentGlucose > 300
                        ? `Severe hyperglycemia at ${p.currentGlucose} mg/dL (${(p.currentGlucose/100).toFixed(1)} g/L). Urgent insulin correction required. CQL recommends ${rec.label}.`
                        : p.currentGlucose > 180
                        ? `Glucose above target (${p.currentGlucose} mg/dL / ${(p.currentGlucose/100).toFixed(1)} g/L). CQL correction: ${rec.label}. Confidence ${(rec.confidence*100).toFixed(0)}%.`
                        : `Glucose in/near target (${p.currentGlucose} mg/dL). CQL recommends: ${rec.label}. Confidence ${(rec.confidence*100).toFixed(0)}%.`
                      }
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
