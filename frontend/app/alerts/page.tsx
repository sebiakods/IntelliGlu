"use client";
import { useState } from "react";
import { usePatientStore } from "@/lib/patientStore";
import { AlertTriangle, CheckCircle, Bell, X } from "lucide-react";

export default function AlertsPage() {
  const { patients } = usePatientStore();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const alerts = patients.flatMap(p => {
    const list = [];
    if (p.currentGlucose < 70)
      list.push({ id: `${p.id}-hypo`, level: "critical", message: `Hypoglycémie sévère : ${p.currentGlucose} mg/dL (${(p.currentGlucose/100).toFixed(2)} g/L)`, patient: p.name, patientId: p.id, time: "maintenant" });
    else if (p.currentGlucose > 300)
      list.push({ id: `${p.id}-hyperS`, level: "critical", message: `Hyperglycémie sévère : ${p.currentGlucose} mg/dL (${(p.currentGlucose/100).toFixed(2)} g/L)`, patient: p.name, patientId: p.id, time: "maintenant" });
    else if (p.currentGlucose > 180)
      list.push({ id: `${p.id}-hyper`, level: "warning", message: `Glucose au-dessus cible : ${p.currentGlucose} mg/dL (${(p.currentGlucose/100).toFixed(2)} g/L)`, patient: p.name, patientId: p.id, time: "maintenant" });
    if (p.hypoglycemiaRiskPct > 25)
      list.push({ id: `${p.id}-risk`, level: "warning", message: `Risque hypoglycémie élevé : ${p.hypoglycemiaRiskPct}%`, patient: p.name, patientId: p.id, time: "maintenant" });
    return list;
  }).filter(a => !dismissed.has(a.id));

  const critical = alerts.filter(a => a.level === "critical");
  const warnings = alerts.filter(a => a.level === "warning");

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }} className="animate-fade">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Alertes Cliniques</h1>
        <p style={{ fontSize: 12, color: "var(--slate-400)", marginTop: 2 }}>
          {critical.length} critiques · {warnings.length} avertissements
        </p>
      </div>

      {alerts.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: "center", color: "var(--slate-400)" }}>
          <CheckCircle size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 600 }}>Aucune alerte active</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Tous les patients sont dans des paramètres normaux</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {alerts.map(a => (
            <div key={a.id} style={{
              display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 18px", borderRadius: 12,
              background: a.level === "critical" ? "var(--critical-bg)" : "var(--high-bg)",
              border: `1.5px solid ${a.level === "critical" ? "var(--critical)" : "var(--high)"}`,
            }}>
              <AlertTriangle size={18} color={a.level === "critical" ? "var(--critical)" : "var(--high)"} style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: a.level === "critical" ? "var(--critical)" : "var(--high)" }}>
                  {a.patient} <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>— {a.patientId}</span>
                </p>
                <p style={{ fontSize: 12, color: "var(--slate-700)", marginTop: 2 }}>{a.message}</p>
                <p style={{ fontSize: 10, color: "var(--slate-400)", marginTop: 3 }}>{a.time}</p>
              </div>
              <button onClick={() => setDismissed(prev => new Set([...prev, a.id]))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--slate-400)", padding: 4 }}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
