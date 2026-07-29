"use client";
import { useState, useEffect } from "react";
import { usePatientStore } from "@/lib/patientStore";
import { runCQLFrontend } from "@/lib/simulator";
import Link from "next/link";
import {
  CheckCircle, AlertCircle, AlertTriangle, ChevronRight, TrendingUp, TrendingDown, Minus,
  Activity, Users, Brain, Zap, RefreshCw
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine
} from "recharts";

function glucoseColor(g: number) {
  if (g < 70) return "var(--critical)";
  if (g > 300) return "var(--glucose-severe)";
  if (g > 180) return "var(--high)";
  if (g >= 140) return "var(--low)";
  return "var(--moderate)";
}

function glucoseLabel(g: number) {
  if (g < 70) return { text: "Hypoglycemia", cls: "badge-critical" };
  if (g > 300) return { text: "Severe Hyper", cls: "badge-critical" };
  if (g > 180) return { text: "Above Target", cls: "badge-high" };
  if (g >= 140) return { text: "In Target ✓", cls: "badge-low" };
  return { text: "Below Target", cls: "badge-moderate" };
}

function glToGdl(gl: number) { return (gl / 100).toFixed(1); }

function generateTrend(base: number, n = 24) {
  const pts = [];
  let g = base + 40;
  for (let i = n; i >= 0; i--) {
    const h = new Date(Date.now() - i * 3600000);
    g = Math.max(60, Math.min(450, g + (Math.random() - 0.5) * 25));
    pts.push({ time: `${h.getHours()}:00`, glucose: Math.round(g) });
  }
  return pts;
}

export default function DashboardPage() {
  const { patients, datasetPatients, newPatients } = usePatientStore();
  const [selId, setSelId] = useState(patients[0]?.id || "");
  const [rec, setRec] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const p = patients.find(x => x.id === selId) || patients[0];
  const trendData = generateTrend(p?.currentGlucose || 180);

  // Compute CQL recommendation from frontend
  useEffect(() => {
    if (!p) return;
    const r = runCQLFrontend(
      p.currentGlucose, 0, p.lastInsulinAction, p.creatinine, p.age
    );
    setRec(r);
  }, [p?.id, p?.currentGlucose]);

  if (!p) return <div>Loading...</div>;
  const glLabel = glucoseLabel(p.currentGlucose);

  const criticalCount  = patients.filter(x => x.status === "Critical").length;
  const atRiskCount    = patients.filter(x => x.status === "At Risk").length;
  const hyperCount     = patients.filter(x => x.currentGlucose > 180).length;
  const hypoCount      = patients.filter(x => x.currentGlucose < 70).length;

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }} className="animate-fade">
      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Patients",    value: patients.length,   sub: `${datasetPatients.length} dataset · ${newPatients.length} new`, icon: Users,       color: "var(--brand)",    bg: "var(--brand-light)" },
          { label: "Critical / At Risk",value: `${criticalCount} / ${atRiskCount}`, sub: "Require immediate attention", icon: AlertTriangle, color: "var(--critical)", bg: "var(--critical-bg)" },
          { label: "Hyperglycemia",     value: hyperCount,        sub: "> 180 mg/dL (1.8 g/L)",   icon: TrendingUp,  color: "var(--high)",     bg: "var(--high-bg)" },
          { label: "Hypoglycemia",      value: hypoCount,         sub: "< 70 mg/dL (0.7 g/L)",    icon: TrendingDown,color: "var(--moderate)", bg: "var(--moderate-bg)" },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <s.icon size={18} color={s.color} />
            </div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 700, color: "var(--slate-900)", fontFamily: "var(--font-mono)" }}>{s.value}</p>
              <p style={{ fontSize: 11, color: "var(--slate-400)", marginTop: 1 }}>{s.label}</p>
              <p style={{ fontSize: 10, color: "var(--slate-400)" }}>{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Patient selector row */}
      <div className="card" style={{ padding: "10px 14px", marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "var(--slate-400)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginRight: 4 }}>Patient:</span>
        {patients.slice(0, 8).map(pt => (
          <button key={pt.id} onClick={() => setSelId(pt.id)}
            style={{
              padding: "5px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: selId === pt.id ? "2px solid var(--brand)" : "1px solid var(--slate-200)",
              background: selId === pt.id ? "var(--brand-light)" : "var(--white)",
              color: selId === pt.id ? "var(--brand)" : "var(--slate-600)",
              transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5
            }}>
            <span className={`status-dot ${pt.status === "Critical" ? "critical" : pt.status === "At Risk" ? "high" : pt.status === "Monitoring" ? "moderate" : "stable"}`} />
            {pt.id}
          </button>
        ))}
        <Link href="/patients" style={{ marginLeft: "auto", fontSize: 12, color: "var(--brand)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
          All patients <ChevronRight size={12} />
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>
        {/* Left: chart + vitals */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Patient header */}
          <div className="card" style={{ padding: "14px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ width: 44, height: 44, borderRadius: 99, background: "var(--brand-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                {p.sex === "M" ? "👨" : "👩"}
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</p>
                <p style={{ fontSize: 12, color: "var(--slate-400)" }}>{p.sex === "M" ? "Male" : "Female"}, {p.age}y · {p.diagnosis} · Day {p.icuStay} ICU</p>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 20 }}>
                {[
                  { label: "Glucose", value: `${p.currentGlucose} mg/dL`, sub: `${glToGdl(p.currentGlucose)} g/L`, color: glucoseColor(p.currentGlucose) },
                  { label: "Time in Range", value: `${p.timeInRange}%`, sub: "Last 24h", color: "var(--low)" },
                  { label: "Hypo Risk", value: `${p.hypoglycemiaRiskPct}%`, sub: p.hypoglycemiaRisk, color: p.hypoglycemiaRiskPct > 20 ? "var(--critical)" : "var(--slate-700)" },
                  { label: "Last Dose", value: `${p.lastInsulinAction}U`, sub: p.lastInsulinTime || "", color: "var(--slate-700)" },
                ].map(s => (
                  <div key={s.label} style={{ borderLeft: "1px solid var(--slate-100)", paddingLeft: 16 }}>
                    <p style={{ fontSize: 10, color: "var(--slate-400)" }}>{s.label}</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: "var(--font-mono)" }}>{s.value}</p>
                    <p style={{ fontSize: 10, color: "var(--slate-400)" }}>{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Glucose trend chart */}
          <div className="card" style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--slate-700)" }}>Glucose Trend — Last 24h</p>
              <span className={`badge ${glLabel.cls}`}>{glLabel.text} · {p.currentGlucose} mg/dL · {glToGdl(p.currentGlucose)} g/L</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="glucoseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--slate-100)" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "var(--slate-400)" }} axisLine={false} tickLine={false} interval={3} />
                <YAxis tick={{ fontSize: 10, fill: "var(--slate-400)" }} axisLine={false} tickLine={false} domain={[50, 400]} />
                <ReferenceLine y={140} stroke="var(--low)" strokeDasharray="4 3" strokeOpacity={0.5} />
                <ReferenceLine y={180} stroke="var(--moderate)" strokeDasharray="4 3" strokeOpacity={0.5} />
                <ReferenceLine y={70}  stroke="var(--critical)" strokeDasharray="4 3" strokeOpacity={0.6} />
                <Tooltip
                  contentStyle={{ background: "white", border: "1px solid var(--slate-200)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [`${v} mg/dL (${(v/100).toFixed(1)} g/L)`, "Glucose"]}
                />
                <Area dataKey="glucose" stroke="var(--brand)" strokeWidth={2} fill="url(#glucoseGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 16, marginTop: 8, justifyContent: "flex-end" }}>
              {[
                { color: "var(--critical)", label: "Hypo <70" },
                { color: "var(--low)", label: "Target 140-180" },
                { color: "var(--moderate)", label: "High >180" },
              ].map(l => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 10, height: 2, background: l.color }} />
                  <span style={{ fontSize: 10, color: "var(--slate-400)" }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Vitals grid */}
          <div className="card" style={{ padding: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--slate-700)", marginBottom: 12 }}>Key Parameters</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
              {[
                { icon: "❤️", label: "Heart Rate",    value: p.heartRate,       unit: "bpm" },
                { icon: "🫀", label: "Blood Pressure", value: p.bloodPressure,  unit: "mmHg" },
                { icon: "🫁", label: "Resp. Rate",     value: p.respiratoryRate,unit: "/min" },
                { icon: "💧", label: "SpO₂",           value: p.spo2,           unit: "%" },
                { icon: "🌡️", label: "Temperature",   value: p.temperature,    unit: "°C" },
                { icon: "🧪", label: "Creatinine",     value: p.creatinine,     unit: "mg/dL" },
                { icon: "🔬", label: "WBC",            value: p.wbc,            unit: "K/µL" },
                { icon: "⚗️", label: "Potassium",      value: p.potassium,      unit: "mEq/L" },
              ].map(v => (
                <div key={v.label} style={{ background: "var(--slate-50)", borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{v.icon}</span>
                  <div>
                    <p style={{ fontSize: 10, color: "var(--slate-400)" }}>{v.label}</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "var(--slate-900)", fontFamily: "var(--font-mono)" }}>
                      {v.value} <span style={{ fontSize: 10, fontWeight: 400, color: "var(--slate-400)", fontFamily: "var(--font-sans)" }}>{v.unit}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: CQL recommendation */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--slate-700)" }}>AI Recommendation</p>
              <span className="badge badge-brand">CQL Model</span>
            </div>

            {rec ? (
              <>
                <div style={{ textAlign: "center", margin: "8px 0 16px" }}>
                  <p style={{ fontSize: 11, color: "var(--slate-400)", marginBottom: 6 }}>Recommended Insulin Action</p>
                  <p style={{ fontSize: 38, fontWeight: 800, color: "var(--brand)", fontFamily: "var(--font-mono)" }}>
                    {rec.dose === 0 ? "0" : rec.dose} U
                  </p>
                  <p style={{ fontSize: 13, color: "var(--slate-600)", marginTop: 2 }}>{rec.label}</p>

                  {/* Confidence bar */}
                  <div style={{ marginTop: 10, padding: "0 8px" }}>
                    <div style={{ background: "var(--slate-100)", borderRadius: 99, height: 6 }}>
                      <div style={{ width: `${(rec.confidence * 100).toFixed(0)}%`, background: rec.confidence > 0.7 ? "var(--low)" : rec.confidence > 0.5 ? "var(--moderate)" : "var(--high)", height: "100%", borderRadius: 99, transition: "width 0.5s" }} />
                    </div>
                    <p style={{ fontSize: 11, color: "var(--slate-500)", marginTop: 4 }}>
                      Confidence: <strong style={{ fontFamily: "var(--font-mono)" }}>{(rec.confidence * 100).toFixed(0)}%</strong>
                    </p>
                  </div>
                </div>

                {/* Q-values bar chart */}
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 11, color: "var(--slate-400)", fontWeight: 600, marginBottom: 6 }}>Q-Value Distribution</p>
                  <ResponsiveContainer width="100%" height={70}>
                    <BarChart data={rec.qValues.map((q: number, i: number) => ({ action: i, q }))} margin={{ top: 2, right: 0, left: -28, bottom: 0 }} barSize={18}>
                      <XAxis dataKey="action" tick={{ fontSize: 9, fill: "var(--slate-400)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={false} axisLine={false} />
                      <Tooltip formatter={(v: any) => [v.toFixed(3), "Q-value"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Bar dataKey="q" radius={[3, 3, 0, 0]}>
                        {rec.qValues.map((_: any, i: number) => (
                          <Cell key={i} fill={i === rec.action ? "var(--brand)" : "var(--slate-200)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Safety warnings */}
                {rec.safetyWarnings.length > 0 && (
                  <div style={{ background: "var(--high-bg)", border: "1px solid var(--high)", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
                    {rec.safetyWarnings.map((w: string, i: number) => (
                      <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                        <AlertTriangle size={12} color="var(--high)" style={{ marginTop: 1, flexShrink: 0 }} />
                        <p style={{ fontSize: 11, color: "var(--high)" }}>{w}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary" style={{ flex: 1 }}>
                    ✓ Accept {rec.dose}U
                  </button>
                  <Link href="/recommendations" style={{ flex: 1 }}>
                    <button className="btn btn-secondary" style={{ width: "100%" }}>
                      ✎ Adjust
                    </button>
                  </Link>
                </div>

                <Link href="/simulator" style={{ display: "block", marginTop: 8 }}>
                  <button className="btn btn-ghost" style={{ width: "100%", fontSize: 12 }}>
                    <Activity size={12} /> Run in Simulator
                  </button>
                </Link>
              </>
            ) : (
              <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
                <div className="shimmer" style={{ width: 120, height: 60 }} />
              </div>
            )}
          </div>

          {/* Patient list quick view */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--slate-700)" }}>Patient Queue</p>
              <Link href="/patients" style={{ fontSize: 11, color: "var(--brand)", textDecoration: "none" }}>View all</Link>
            </div>
            {patients.slice(0, 6).map(pt => (
              <button key={pt.id} onClick={() => setSelId(pt.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px", borderRadius: 8, marginBottom: 3,
                  border: selId === pt.id ? "1.5px solid var(--brand)" : "1px solid transparent",
                  background: selId === pt.id ? "var(--brand-light)" : "transparent",
                  cursor: "pointer", textAlign: "left"
                }}>
                <span className={`status-dot ${pt.status === "Critical" ? "critical" : pt.status === "At Risk" ? "high" : pt.status === "Monitoring" ? "moderate" : "stable"}`} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--slate-900)" }}>{pt.name}</p>
                  <p style={{ fontSize: 10, color: "var(--slate-400)" }}>{pt.id} · {pt.diagnosis}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: glucoseColor(pt.currentGlucose), fontFamily: "var(--font-mono)" }}>{pt.currentGlucose}</p>
                  <p style={{ fontSize: 9, color: "var(--slate-400)" }}>{(pt.currentGlucose/100).toFixed(1)} g/L</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
