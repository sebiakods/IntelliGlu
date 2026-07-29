"use client";
import { useState, useEffect } from "react";
import { usePatientStore } from "@/lib/patientStore";
import { runCQLFrontend } from "@/lib/simulator";
import { Activity, Wifi, WifiOff, RefreshCw } from "lucide-react";

function glucoseColor(g: number) {
  if (g < 70)  return "var(--critical)";
  if (g > 300) return "#7c3aed";
  if (g > 180) return "var(--high)";
  if (g >= 140) return "var(--low)";
  return "var(--moderate)";
}
const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Stable:     { bg: "var(--low-bg)",      color: "var(--low)" },
  Monitoring: { bg: "var(--info-bg)",     color: "var(--info)" },
  "At Risk":  { bg: "var(--high-bg)",     color: "var(--high)" },
  Critical:   { bg: "var(--critical-bg)", color: "var(--critical)" },
};

export default function RealtimePage() {
  const { patients } = usePatientStore();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }} className="animate-fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Monitoring Temps Réel</h1>
          <p style={{ fontSize: 12, color: "var(--slate-400)", marginTop: 2 }}>
            {patients.length} patients · Mise à jour automatique toutes les 5s
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--low)", animation: "pulse 1.5s infinite" }} />
          <span style={{ fontSize: 12, color: "var(--low)", fontWeight: 600 }}>Live</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
        {patients.map(p => {
          const rec = runCQLFrontend(p.currentGlucose, 0, p.lastInsulinAction, p.creatinine, p.age);
          const st  = STATUS_STYLE[p.status] || STATUS_STYLE.Stable;
          return (
            <div key={p.id} className="card" style={{ padding: 18, transition: "box-shadow 0.2s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</p>
                  <p style={{ fontSize: 10, color: "var(--slate-400)", fontFamily: "var(--font-mono)" }}>{p.id} · {p.icuRoom}</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 99, background: st.bg, color: st.color }}>
                  {p.status}
                </span>
              </div>

              {/* Glucose */}
              <div style={{ textAlign: "center", margin: "10px 0 14px" }}>
                <p style={{ fontSize: 36, fontWeight: 800, color: glucoseColor(p.currentGlucose), fontFamily: "var(--font-mono)", lineHeight: 1 }}>
                  {p.currentGlucose}
                </p>
                <p style={{ fontSize: 11, color: "var(--slate-400)" }}>
                  mg/dL &nbsp;·&nbsp; {(p.currentGlucose/100).toFixed(2)} g/L
                </p>
              </div>

              {/* Vitals row */}
              <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 12, padding: "8px 0", borderTop: "1px solid var(--slate-100)", borderBottom: "1px solid var(--slate-100)" }}>
                {[
                  { label: "❤️", value: `${p.heartRate}`, unit: "bpm" },
                  { label: "💧", value: `${p.spo2}`, unit: "%" },
                  { label: "🌡️", value: `${p.temperature}`, unit: "°C" },
                ].map(v => (
                  <div key={v.label} style={{ textAlign: "center" }}>
                    <p style={{ fontSize: 14 }}>{v.label}</p>
                    <p style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{v.value}<span style={{ fontSize: 9, fontWeight: 400 }}> {v.unit}</span></p>
                  </div>
                ))}
              </div>

              {/* CQL */}
              <div style={{ background: "var(--brand-light)", borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: 9.5, color: "var(--brand)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>CQL</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)" }}>{rec.label}</p>
                </div>
                <p style={{ fontSize: 22, fontWeight: 800, color: "var(--brand)", fontFamily: "var(--font-mono)" }}>{rec.dose}U</p>
              </div>

              {/* TIR bar */}
              <div style={{ marginTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 10, color: "var(--slate-400)" }}>Temps dans cible</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: p.timeInRange >= 70 ? "var(--low)" : "var(--moderate)", fontFamily: "var(--font-mono)" }}>{p.timeInRange}%</span>
                </div>
                <div style={{ background: "var(--slate-100)", borderRadius: 99, height: 5, overflow: "hidden" }}>
                  <div style={{ width: `${p.timeInRange}%`, height: "100%", background: p.timeInRange >= 70 ? "var(--low)" : "var(--moderate)", borderRadius: 99, transition: "width 0.5s" }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
