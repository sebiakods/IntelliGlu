"use client";
import { useState, useEffect } from "react";
import { usePatientStore } from "@/lib/patientStore";
import {
  FileText, Download, RefreshCw, Plus, AlertTriangle,
  TrendingUp, TrendingDown, Activity, CheckCircle, Clock
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from "recharts";

const API = "http://localhost:8000/api/v1";

function glucoseColor(g: number) {
  if (g < 70) return "var(--critical)";
  if (g > 300) return "#7c3aed";
  if (g > 180) return "var(--high)";
  if (g >= 140) return "var(--low)";
  return "var(--moderate)";
}

export default function ReportsPage() {
  const { patients } = usePatientStore();
  const [reports,   setReports]   = useState<any[]>([]);
  const [selPat,    setSelPat]    = useState(patients[0]?.id || "");
  const [period,    setPeriod]    = useState(7);
  const [loading,   setLoading]   = useState(false);
  const [selReport, setSelReport] = useState<any | null>(null);
  const [icuSummary,setIcuSummary] = useState<any | null>(null);
  const [backendOk, setBackendOk] = useState(false);

  // Load existing reports + ICU summary on mount
  useEffect(() => {
    Promise.all([
      fetch(`${API}/reports/`).then(r => r.json()).catch(() => []),
      fetch(`${API}/reports/summary/icu`).then(r => r.json()).catch(() => null),
    ]).then(([reps, summary]) => {
      if (Array.isArray(reps)) { setReports(reps); setBackendOk(true); }
      if (summary) setIcuSummary(summary);
    });
  }, []);

  async function generateReport() {
    if (!selPat) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/reports/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: selPat, period_days: period, report_type: "comprehensive" }),
      });
      const data = await res.json();
      setReports(prev => [data, ...prev]);
      setSelReport(data);
      setBackendOk(true);
    } catch {
      // Fallback: generate client-side
      const patient = patients.find(p => p.id === selPat);
      if (!patient) return;
      const series = generateClientSeries(patient.currentGlucose, period * 24);
      const stats  = computeStats(series);
      const report = {
        report_id:    `R-${Date.now().toString().slice(-6)}`,
        patient_id:   selPat,
        patient_name: patient.name,
        patient_age:  patient.age,
        patient_sex:  patient.sex,
        diagnosis:    patient.diagnosis,
        diabetes:     patient.diabetes,
        report_type:  "comprehensive",
        period_days:  period,
        generated_at: new Date().toISOString(),
        generated_by: "IntelliGlu CQL v2.0 (mode hors-ligne)",
        status:       "final",
        statistics:   stats,
        current_state: {
          glucose:             patient.currentGlucose,
          glucose_g_l:         +(patient.currentGlucose / 100).toFixed(2),
          cql_recommendation:  cqlLabel(patient.currentGlucose),
          status:              patient.status,
          time_in_range:       patient.timeInRange,
          hypoglycemia_risk:   patient.hypoglycemiaRisk,
        },
        glucose_series: series.slice(-48),
        clinical_notes: buildNotes(stats, patient.currentGlucose, patient.creatinine),
      };
      setReports(prev => [report, ...prev]);
      setSelReport(report);
    } finally { setLoading(false); }
  }

  function generateClientSeries(base: number, n: number) {
    const out = []; let g = base + 60;
    const now = new Date();
    for (let i = n; i >= 0; i--) {
      const t = new Date(now.getTime() - i * 3600000);
      g = Math.max(55, Math.min(450, g + 2 + (Math.random()-0.5)*20));
      const dose = g > 180 ? (Math.random() > 0.6 ? [3,4,5][Math.floor(Math.random()*3)] : 0) : 0;
      if (dose > 0) g -= dose * 16 * (0.8 + Math.random()*0.4);
      out.push({ time: t.toISOString().slice(0,16), glucose: Math.round(g), dose });
    }
    return out;
  }
  function computeStats(series: any[]) {
    const gs = series.map(r => r.glucose);
    const inRange = gs.filter(g => g >= 140 && g <= 180).length;
    const above   = gs.filter(g => g > 180).length;
    const hypo    = gs.filter(g => g < 70).length;
    const insulin = series.reduce((s,r) => s + r.dose, 0);
    const mean    = gs.reduce((a,b) => a+b, 0) / gs.length;
    const std     = Math.sqrt(gs.reduce((s,g) => s + (g-mean)**2, 0) / gs.length);
    return {
      mean_glucose: Math.round(mean),
      min_glucose: Math.min(...gs),
      max_glucose: Math.max(...gs),
      std_glucose: Math.round(std),
      time_in_range_pct: Math.round(inRange/gs.length*100),
      time_above_range_pct: Math.round(above/gs.length*100),
      time_below_range_pct: Math.round((gs.length-inRange-above)/gs.length*100),
      hypoglycemia_events: hypo,
      near_hypo_events: gs.filter(g => g < 110).length,
      total_insulin_units: Math.round(insulin*10)/10,
      insulin_doses_count: series.filter(r => r.dose > 0).length,
      mean_dose_per_admin: insulin > 0 ? Math.round(insulin/series.filter(r=>r.dose>0).length*10)/10 : 0,
    };
  }
  function cqlLabel(g: number) {
    if (g < 70) return "No Dose (0U)";
    if (g <= 140) return "No Dose (0U)";
    if (g <= 180) return "Low 0.5U";
    if (g <= 220) return "Low-Med 1.5U";
    if (g <= 260) return "Medium 3U";
    if (g <= 300) return "Med-High 5U";
    return "High 8U";
  }
  function buildNotes(stats: any, g: number, creat: number = 1) {
    const n = [];
    if (stats.time_in_range_pct < 50) n.push({ level:"warning", text:`Temps dans la cible (${stats.time_in_range_pct}%) insuffisant. Cible internationale : ≥70%.` });
    else if (stats.time_in_range_pct >= 70) n.push({ level:"good", text:`Excellent contrôle glycémique : ${stats.time_in_range_pct}% dans la cible.` });
    if (stats.hypoglycemia_events > 0) n.push({ level:"critical", text:`${stats.hypoglycemia_events} événements hypoglycémiques (<70 mg/dL) détectés.` });
    if (g > 300) n.push({ level:"critical", text:`Glycémie actuelle ${g} mg/dL (${(g/100).toFixed(2)} g/L) — Hyperglycémie sévère. CQL: High dose (8U).` });
    if (creat > 2) n.push({ level:"warning", text:`Créatinine élevée (${creat}) — Insuffisance rénale. Surveiller effet insuline prolongé.` });
    return n;
  }

  async function deleteReport(id: string) {
    try { await fetch(`${API}/reports/${id}`, { method: "DELETE" }); } catch {}
    setReports(prev => prev.filter(r => r.report_id !== id));
    if (selReport?.report_id === id) setSelReport(null);
  }

  const chartData = selReport?.glucose_series?.map((r: any) => ({
    t: r.time?.slice(11,16) || "",
    g: r.glucose,
    d: r.dose,
  })) || [];

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }} className="animate-fade">
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Rapports Cliniques</h1>
        <p style={{ fontSize: 12, color: "var(--slate-400)", marginTop: 2 }}>
          Rapports glycémiques générés par CQL
          {backendOk && <span className="badge badge-low" style={{ marginLeft: 8 }}>Backend connecté</span>}
        </p>
      </div>

      {/* ICU Summary */}
      {icuSummary && (
        <div className="card" style={{ padding: "12px 18px", marginBottom: 16, display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Résumé UCI</p>
          {[
            { label: "Total patients",  value: icuSummary.total_patients,                             color: "var(--brand)" },
            { label: "Critiques",       value: icuSummary.status_breakdown?.critical,                 color: "var(--critical)" },
            { label: "Hyperglycémie",   value: icuSummary.glucose_summary?.hyperglycemia_count,       color: "var(--high)" },
            { label: "Hypoglycémie",    value: icuSummary.glucose_summary?.hypoglycemia_count,        color: "var(--moderate)" },
            { label: "Dans cible",      value: icuSummary.glucose_summary?.in_target_count,           color: "var(--low)" },
            { label: "Moy. glycémie",   value: `${icuSummary.glucose_summary?.mean_glucose} mg/dL`,   color: "var(--slate-700)" },
          ].map(s => (
            <div key={s.label} style={{ borderLeft: "1px solid var(--slate-100)", paddingLeft: 16 }}>
              <p style={{ fontSize: 10, color: "var(--slate-400)" }}>{s.label}</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: "var(--font-mono)" }}>{s.value}</p>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={() => {
            fetch(`${API}/reports/summary/icu`).then(r=>r.json()).then(setIcuSummary).catch(()=>{});
          }}>
            <RefreshCw size={12} /> Actualiser
          </button>
        </div>
      )}

      {/* Generate controls */}
      <div className="card" style={{ padding: "12px 16px", marginBottom: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <select className="input" value={selPat} onChange={e => setSelPat(e.target.value)} style={{ width: 220, height: 34 }}>
          {patients.map(p => <option key={p.id} value={p.id}>{p.id} — {p.name}</option>)}
        </select>
        <select className="input" value={period} onChange={e => setPeriod(+e.target.value)} style={{ width: 160, height: 34 }}>
          {[1,3,7,14,30].map(d => <option key={d} value={d}>{d} jour{d>1?"s":""}</option>)}
        </select>
        <button className="btn btn-primary" onClick={generateReport} disabled={loading}>
          {loading ? <><RefreshCw size={13} style={{ animation:"spin 1s linear infinite" }} /> Génération…</> : <><Plus size={13} /> Générer rapport</>}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 14 }}>
        {/* Report list */}
        <div className="card" style={{ padding: 12, maxHeight: "75vh", overflowY: "auto" }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--slate-400)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            Rapports ({reports.length})
          </p>
          {reports.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--slate-400)", textAlign: "center", padding: "24px 0" }}>
              Aucun rapport — générez-en un ci-dessus
            </p>
          ) : reports.map(r => (
            <button key={r.report_id} onClick={() => setSelReport(r)}
              style={{
                width: "100%", padding: "10px 10px", borderRadius: 8, textAlign: "left",
                border: selReport?.report_id === r.report_id ? "1.5px solid var(--brand)" : "1px solid var(--slate-100)",
                background: selReport?.report_id === r.report_id ? "var(--brand-light)" : "var(--white)",
                cursor: "pointer", marginBottom: 4, transition: "all 0.12s",
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: selReport?.report_id === r.report_id ? "var(--brand)" : "var(--slate-900)" }}>
                  {r.patient_name || r.patient_id}
                </p>
                <span style={{ fontSize: 9.5, fontFamily: "var(--font-mono)", background: "var(--slate-100)", borderRadius: 4, padding: "1px 5px", color: "var(--slate-500)" }}>
                  {r.report_id}
                </span>
              </div>
              <p style={{ fontSize: 10, color: "var(--slate-400)", marginTop: 2 }}>
                {r.period_days}j · {new Date(r.generated_at).toLocaleDateString("fr-DZ")}
              </p>
              <div style={{ display: "flex", gap: 6, marginTop: 5, alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: glucoseColor(r.current_state?.glucose || 160), fontFamily: "var(--font-mono)" }}>
                  {r.current_state?.glucose} mg/dL
                </span>
                <span style={{ fontSize: 10, color: "var(--slate-400)" }}>·</span>
                <span style={{ fontSize: 11, color: r.statistics?.time_in_range_pct >= 70 ? "var(--low)" : "var(--moderate)", fontWeight: 600 }}>
                  TIR {r.statistics?.time_in_range_pct}%
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Report detail */}
        {selReport ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Header */}
            <div className="card" style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 700 }}>{selReport.patient_name}</p>
                  <p style={{ fontSize: 11, color: "var(--slate-400)" }}>
                    {selReport.patient_sex}/{selReport.patient_age}y · {selReport.diagnosis} · {selReport.diabetes}
                  </p>
                  <p style={{ fontSize: 10, color: "var(--slate-400)", marginTop: 2 }}>
                    Rapport #{selReport.report_id} · Généré le {new Date(selReport.generated_at).toLocaleString("fr-DZ")}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span className="badge badge-brand"><FileText size={10} /> {selReport.report_type}</span>
                  <span className="badge badge-low">✓ {selReport.status}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => deleteReport(selReport.report_id)}>✕</button>
                </div>
              </div>

              {/* Stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
                {[
                  { label: "Glycémie moy.", value: `${selReport.statistics.mean_glucose} mg/dL`, sub: `${(selReport.statistics.mean_glucose/100).toFixed(2)} g/L`, color: glucoseColor(selReport.statistics.mean_glucose) },
                  { label: "Min / Max",      value: `${selReport.statistics.min_glucose}/${selReport.statistics.max_glucose}`, color: "var(--slate-700)" },
                  { label: "Temps cible",    value: `${selReport.statistics.time_in_range_pct}%`, color: selReport.statistics.time_in_range_pct >= 70 ? "var(--low)" : "var(--moderate)" },
                  { label: "Événements hypo",value: selReport.statistics.hypoglycemia_events, color: selReport.statistics.hypoglycemia_events > 0 ? "var(--critical)" : "var(--low)" },
                  { label: "Insuline totale",value: `${selReport.statistics.total_insulin_units}U`, color: "var(--brand)" },
                ].map(s => (
                  <div key={s.label} style={{ background: "var(--slate-50)", borderRadius: 10, padding: "10px 12px" }}>
                    <p style={{ fontSize: 10, color: "var(--slate-400)" }}>{s.label}</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: s.color, fontFamily: "var(--font-mono)" }}>{s.value}</p>
                    {(s as any).sub && <p style={{ fontSize: 9, color: "var(--slate-400)" }}>{(s as any).sub}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Glucose chart */}
            {chartData.length > 0 && (
              <div className="card" style={{ padding: "16px 20px" }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Glycémie — 48 dernières heures</p>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="repGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="var(--brand)" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--slate-100)" />
                    <XAxis dataKey="t" tick={{ fontSize: 9, fill: "var(--slate-400)" }} axisLine={false} tickLine={false} interval={7} />
                    <YAxis tick={{ fontSize: 9, fill: "var(--slate-400)" }} axisLine={false} tickLine={false} domain={[50, 400]} />
                    <ReferenceLine y={70}  stroke="var(--critical)"  strokeDasharray="3 3" strokeOpacity={0.7} />
                    <ReferenceLine y={140} stroke="var(--low)"       strokeDasharray="3 3" strokeOpacity={0.5} />
                    <ReferenceLine y={180} stroke="var(--moderate)"  strokeDasharray="3 3" strokeOpacity={0.5} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid var(--slate-200)" }}
                      formatter={(v: any, name: string) => [
                        name === "g" ? `${v} mg/dL (${(v/100).toFixed(2)} g/L)` : `${v}U`,
                        name === "g" ? "Glycémie" : "Dose"
                      ]}
                    />
                    <Area dataKey="g" stroke="var(--brand)" strokeWidth={2} fill="url(#repGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Clinical notes */}
            {selReport.clinical_notes?.length > 0 && (
              <div className="card" style={{ padding: "16px 20px" }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Notes Cliniques</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {selReport.clinical_notes.map((note: any, i: number) => (
                    <div key={i} style={{
                      display: "flex", gap: 10, padding: "10px 14px", borderRadius: 10,
                      background: note.level === "critical" ? "var(--critical-bg)" : note.level === "warning" ? "var(--high-bg)" : "var(--low-bg)",
                      border: `1px solid ${note.level === "critical" ? "var(--critical)" : note.level === "warning" ? "var(--high)" : "var(--low)"}`,
                    }}>
                      {note.level === "critical" ? <AlertTriangle size={14} color="var(--critical)" style={{ flexShrink: 0, marginTop: 1 }} />
                        : note.level === "warning" ? <AlertTriangle size={14} color="var(--high)" style={{ flexShrink: 0, marginTop: 1 }} />
                        : <CheckCircle size={14} color="var(--low)" style={{ flexShrink: 0, marginTop: 1 }} />}
                      <p style={{ fontSize: 12, color: note.level === "critical" ? "var(--critical)" : note.level === "warning" ? "var(--high)" : "var(--low)", lineHeight: 1.6 }}>
                        {note.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CQL state */}
            <div className="card" style={{ padding: "14px 18px" }}>
              <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>État Actuel & Recommandation CQL</p>
              <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <p style={{ fontSize: 10, color: "var(--slate-400)" }}>Glycémie</p>
                  <p style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-mono)", color: glucoseColor(selReport.current_state.glucose) }}>
                    {selReport.current_state.glucose} <span style={{ fontSize: 12, fontWeight: 400 }}>mg/dL</span>
                  </p>
                  <p style={{ fontSize: 11, color: "var(--slate-400)" }}>{selReport.current_state.glucose_g_l} g/L</p>
                </div>
                <div style={{ borderLeft: "1px solid var(--slate-100)", paddingLeft: 20 }}>
                  <p style={{ fontSize: 10, color: "var(--slate-400)" }}>Recommandation CQL</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "var(--brand)" }}>{selReport.current_state.cql_recommendation}</p>
                </div>
                <div style={{ borderLeft: "1px solid var(--slate-100)", paddingLeft: 20 }}>
                  <p style={{ fontSize: 10, color: "var(--slate-400)" }}>Statut</p>
                  <span className={`badge ${selReport.current_state.status === "Critical" ? "badge-critical" : selReport.current_state.status === "At Risk" ? "badge-high" : selReport.current_state.status === "Monitoring" ? "badge-info" : "badge-low"}`}>
                    {selReport.current_state.status}
                  </span>
                </div>
                <div style={{ borderLeft: "1px solid var(--slate-100)", paddingLeft: 20 }}>
                  <p style={{ fontSize: 10, color: "var(--slate-400)" }}>Temps dans cible</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: (selReport.current_state.time_in_range || 0) >= 70 ? "var(--low)" : "var(--moderate)" }}>
                    {selReport.current_state.time_in_range}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, color: "var(--slate-400)" }}>
            <FileText size={48} style={{ opacity: 0.15, marginBottom: 12 }} />
            <p style={{ fontSize: 14, fontWeight: 600 }}>Aucun rapport sélectionné</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Générez un rapport ou sélectionnez-en un à gauche</p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
