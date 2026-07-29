"use client";
import { useState } from "react";
import Link from "next/link";
import { usePatientStore } from "@/lib/patientStore";
import { Search, Plus, Database, UserPlus, Trash2, Brain } from "lucide-react";

const RISK_COLOR: Record<string, string> = {
  Low: "var(--low)", Moderate: "var(--moderate)", High: "var(--high)", Critical: "var(--critical)"
};
const STATUS_CLASS: Record<string, string> = {
  Stable: "badge-low", Monitoring: "badge-info", "At Risk": "badge-high", Critical: "badge-critical"
};
function glucoseColor(g: number) {
  if (g < 70) return "var(--critical)";
  if (g > 300) return "#7C3AED";
  if (g > 180) return "var(--high)";
  if (g >= 140) return "var(--low)";
  return "var(--moderate)";
}

export default function PatientsPage() {
  const { patients, datasetPatients, newPatients, removePatient } = usePatientStore();
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const rows = patients.filter(p => {
    const matchSearch = !search || p.id.toLowerCase().includes(search.toLowerCase()) || p.name.toLowerCase().includes(search.toLowerCase()) || p.diagnosis.toLowerCase().includes(search.toLowerCase());
    const matchRisk   = riskFilter === "All" || p.hypoglycemiaRisk === riskFilter;
    const matchStatus = statusFilter === "All" || p.status === statusFilter;
    const matchSource = sourceFilter === "All" || (sourceFilter === "Dataset" ? p.source === "dataset" : p.source === "new");
    return matchSearch && matchRisk && matchStatus && matchSource;
  });

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }} className="animate-fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Patients</h1>
          <p style={{ fontSize: 12, color: "var(--slate-400)", marginTop: 2 }}>
            {patients.length} total · <span style={{ color: "var(--brand)" }}>{datasetPatients.length} from dataset</span> · <span style={{ color: "var(--low)" }}>{newPatients.length} added</span>
          </p>
        </div>
        <Link href="/patients/add"><button className="btn btn-primary"><UserPlus size={14} /> Add Patient</button></Link>
      </div>

      {/* Source tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          { key: "All",     label: `All (${patients.length})` },
          { key: "Dataset", label: `Dataset (${datasetPatients.length})` },
          { key: "New",     label: `New Patients (${newPatients.length})` },
        ].map(s => (
          <button key={s.key} onClick={() => setSourceFilter(s.key)}
            style={{
              padding: "6px 16px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: sourceFilter === s.key ? "2px solid var(--brand)" : "1px solid var(--slate-200)",
              background: sourceFilter === s.key ? "var(--brand-light)" : "var(--white)",
              color: sourceFilter === s.key ? "var(--brand)" : "var(--slate-500)",
            }}>{s.label}</button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--slate-400)" }} />
          <input className="input" style={{ paddingLeft: 30 }} placeholder="Search by ID, name, diagnosis..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input" value={riskFilter} onChange={e => setRiskFilter(e.target.value)} style={{ width: 150, cursor: "pointer" }}>
          {["All", "Low", "Moderate", "High", "Critical"].map(o => <option key={o}>{o === "All" ? "All Risks" : o}</option>)}
        </select>
        <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 160, cursor: "pointer" }}>
          {["All", "Stable", "Monitoring", "At Risk", "Critical"].map(o => <option key={o}>{o === "All" ? "All Statuses" : o}</option>)}
        </select>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--slate-100)", background: "var(--slate-50)" }}>
              {["Patient", "Glucose (mg/dL / g/L)", "Status", "Risk", "Last Dose", "Time in Range", "Diagnosis", "Source", "Actions"].map(h => (
                <th key={h} style={{ padding: "10px 14px", fontSize: 10, fontWeight: 600, color: "var(--slate-400)", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: "center", padding: 40, color: "var(--slate-400)", fontSize: 13 }}>No patients found</td></tr>
            ) : rows.map(p => (
              <tr key={p.id} style={{ borderBottom: "1px solid var(--slate-50)", transition: "background 0.12s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--slate-50)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "10px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className={`status-dot ${p.status === "Critical" ? "critical" : p.status === "At Risk" ? "high" : p.status === "Monitoring" ? "moderate" : "stable"}`} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</p>
                      <p style={{ fontSize: 10, color: "var(--slate-400)", fontFamily: "var(--font-mono)" }}>{p.id} · {p.sex}/{p.age}y · {p.icuRoom}</p>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: glucoseColor(p.currentGlucose) }}>{p.currentGlucose}</p>
                  <p style={{ fontSize: 10, color: "var(--slate-400)" }}>{(p.currentGlucose / 100).toFixed(1)} g/L</p>
                </td>
                <td style={{ padding: "10px 14px" }}><span className={`badge ${STATUS_CLASS[p.status]}`}>{p.status}</span></td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: RISK_COLOR[p.hypoglycemiaRisk] }}>{p.hypoglycemiaRisk} <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>({p.hypoglycemiaRiskPct}%)</span></span>
                </td>
                <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600 }}>{p.lastInsulinAction}U</td>
                <td style={{ padding: "10px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 64, height: 5, background: "var(--slate-100)", borderRadius: 99 }}>
                      <div style={{ width: `${p.timeInRange}%`, height: "100%", background: p.timeInRange >= 70 ? "var(--low)" : "var(--moderate)", borderRadius: 99 }} />
                    </div>
                    <span style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}>{p.timeInRange}%</span>
                  </div>
                </td>
                <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--slate-600)" }}>{p.diagnosis}</td>
                <td style={{ padding: "10px 14px" }}>
                  <span className={`badge ${p.source === "dataset" ? "badge-brand" : "badge-low"}`}>
                    {p.source === "dataset" ? "Dataset" : "New"}
                  </span>
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Link href={`/recommendations?patient=${p.id}`}>
                      <button className="btn btn-secondary btn-sm"><Brain size={11} /> Rec.</button>
                    </Link>
                    {p.source === "new" && (
                      confirmDel === p.id ? (
                        <>
                          <button className="btn btn-danger btn-sm" onClick={() => { removePatient(p.id); setConfirmDel(null); }}>Confirm</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(null)}>✕</button>
                        </>
                      ) : (
                        <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(p.id)}><Trash2 size={11} /></button>
                      )
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
