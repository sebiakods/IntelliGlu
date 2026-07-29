"use client";
import { usePatientStore } from "@/lib/patientStore";
import { runCQLFrontend } from "@/lib/simulator";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export default function AnalyticsPage() {
  const { patients } = usePatientStore();

  const statusCounts = ["Stable","Monitoring","At Risk","Critical"].map(s => ({
    name: s,
    count: patients.filter(p => p.status === s).length,
  }));
  const riskCounts = ["Low","Moderate","High","Critical"].map(r => ({
    name: r,
    count: patients.filter(p => p.hypoglycemiaRisk === r).length,
  }));
  const glucoseRanges = [
    { name: "<70",     count: patients.filter(p => p.currentGlucose < 70).length,                                    color: "#ef4444" },
    { name: "70-139",  count: patients.filter(p => p.currentGlucose >= 70 && p.currentGlucose < 140).length,         color: "#f59e0b" },
    { name: "140-180", count: patients.filter(p => p.currentGlucose >= 140 && p.currentGlucose <= 180).length,       color: "#22c55e" },
    { name: "181-300", count: patients.filter(p => p.currentGlucose > 180 && p.currentGlucose <= 300).length,        color: "#f97316" },
    { name: ">300",    count: patients.filter(p => p.currentGlucose > 300).length,                                   color: "#7c3aed" },
  ];
  const meanTIR     = patients.length ? Math.round(patients.reduce((s,p) => s+p.timeInRange,0)/patients.length) : 0;
  const meanGlucose = patients.length ? Math.round(patients.reduce((s,p) => s+p.currentGlucose,0)/patients.length) : 0;
  const STATUS_COLORS: Record<string, string> = { Stable:"#22c55e", Monitoring:"#0ea5e9", "At Risk":"#f97316", Critical:"#ef4444" };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }} className="animate-fade">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Analytique</h1>
        <p style={{ fontSize: 12, color: "var(--slate-400)", marginTop: 2 }}>Vue d'ensemble clinique — {patients.length} patients</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Patients total",    value: patients.length,         color: "var(--brand)" },
          { label: "Glycémie moyenne",  value: `${meanGlucose} mg/dL`,  color: meanGlucose > 180 ? "var(--high)" : "var(--low)" },
          { label: "TIR moyen",         value: `${meanTIR}%`,           color: meanTIR >= 70 ? "var(--low)" : "var(--moderate)" },
          { label: "Critiques",         value: patients.filter(p => p.status === "Critical").length, color: "var(--critical)" },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: "16px 20px" }}>
            <p style={{ fontSize: 11, color: "var(--slate-400)", marginBottom: 4 }}>{s.label}</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: "var(--font-mono)" }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Glucose distribution */}
        <div className="card" style={{ padding: "16px 20px" }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Distribution Glycémique</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={glucoseRanges} margin={{ top: 4, right: 4, left: -28, bottom: 0 }} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--slate-100)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--slate-400)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--slate-400)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Bar dataKey="count" radius={[4,4,0,0]}>
                {glucoseRanges.map((r,i) => <Cell key={i} fill={r.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status pie */}
        <div className="card" style={{ padding: "16px 20px" }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Répartition par Statut</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={statusCounts} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, count }) => `${name}: ${count}`} labelLine={false}>
                {statusCounts.map((s,i) => <Cell key={i} fill={STATUS_COLORS[s.name] || "#94a3b8"} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-patient table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--slate-100)" }}>
          <p style={{ fontSize: 13, fontWeight: 600 }}>Détail par Patient</p>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--slate-50)" }}>
              {["Patient","Glycémie","g/L","TIR","Risque","Rec. CQL","Statut"].map(h => (
                <th key={h} style={{ padding: "8px 14px", fontSize: 10, fontWeight: 600, color: "var(--slate-400)", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {patients.map(p => {
              const rec = runCQLFrontend(p.currentGlucose, 0, p.lastInsulinAction, p.creatinine, p.age);
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--slate-50)" }}>
                  <td style={{ padding: "9px 14px" }}>
                    <p style={{ fontSize: 12, fontWeight: 700 }}>{p.name}</p>
                    <p style={{ fontSize: 10, color: "var(--slate-400)", fontFamily: "var(--font-mono)" }}>{p.id}</p>
                  </td>
                  <td style={{ padding: "9px 14px", fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: `${p.currentGlucose < 70 ? "var(--critical)" : p.currentGlucose > 180 ? "var(--high)" : "var(--low)"}` }}>{p.currentGlucose}</td>
                  <td style={{ padding: "9px 14px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--slate-500)" }}>{(p.currentGlucose/100).toFixed(2)}</td>
                  <td style={{ padding: "9px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 50, height: 5, background: "var(--slate-100)", borderRadius: 99 }}>
                        <div style={{ width: `${p.timeInRange}%`, height: "100%", background: p.timeInRange >= 70 ? "var(--low)" : "var(--moderate)", borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}>{p.timeInRange}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "9px 14px" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: p.hypoglycemiaRisk === "Critical" || p.hypoglycemiaRisk === "High" ? "var(--critical)" : p.hypoglycemiaRisk === "Moderate" ? "var(--moderate)" : "var(--low)" }}>
                      {p.hypoglycemiaRisk} ({p.hypoglycemiaRiskPct}%)
                    </span>
                  </td>
                  <td style={{ padding: "9px 14px", fontWeight: 700, color: "var(--brand)", fontSize: 12 }}>{rec.dose}U — {rec.label}</td>
                  <td style={{ padding: "9px 14px" }}>
                    <span className={`badge ${p.status === "Critical" ? "badge-critical" : p.status === "At Risk" ? "badge-high" : p.status === "Monitoring" ? "badge-info" : "badge-low"}`}>{p.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
