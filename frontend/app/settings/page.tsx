"use client";
import { useState, useEffect } from "react";
import { Settings, Bell, Shield, User, Save, RefreshCw, Activity, Database, Info, Check } from "lucide-react";

const API = "http://localhost:8000/api/v1";

interface Thresholds {
  hypoglycemia_threshold: number;
  hyperglycemia_threshold: number;
  target_glucose_min: number;
  target_glucose_max: number;
  dose_max: number;
  monitoring_interval_sec: number;
}

export default function SettingsPage() {
  const [thresholds, setThresholds] = useState<Thresholds>({
    hypoglycemia_threshold: 70,
    hyperglycemia_threshold: 180,
    target_glucose_min: 140,
    target_glucose_max: 180,
    dose_max: 12,
    monitoring_interval_sec: 300,
  });
  const [profile, setProfile] = useState({
    clinician_name: "Dr. Ahmed Benali",
    hospital: "CHU Sétif",
    department: "Réanimation UCI",
    language: "fr",
    glucose_unit: "mg/dL",
    notifications: true,
    auto_recommend: true,
    dark_mode: false,
  });
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"clinical"|"profile"|"model"|"system">("clinical");

  useEffect(() => {
    Promise.all([
      fetch(`${API}/settings/`).then(r => r.json()).catch(() => null),
      fetch(`${API}/settings/model`).then(r => r.json()).catch(() => null),
    ]).then(([settings, model]) => {
      if (settings?.thresholds) setThresholds(t => ({ ...t, ...settings.thresholds }));
      if (settings?.profile)    setProfile(p => ({ ...p, ...settings.profile }));
      if (model)                setModelInfo(model);
      setLoading(false);
    });
  }, []);

  async function saveThresholds() {
    try {
      await fetch(`${API}/settings/thresholds`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(thresholds),
      });
      setSaved("clinical");
      setTimeout(() => setSaved(null), 2500);
    } catch { setSaved("error"); }
  }

  async function saveProfile() {
    try {
      await fetch(`${API}/settings/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      setSaved("profile");
      setTimeout(() => setSaved(null), 2500);
    } catch { setSaved("error"); }
  }

  async function resetThresholds() {
    try {
      const res = await fetch(`${API}/settings/thresholds/reset`, { method: "POST" });
      const data = await res.json();
      if (data.thresholds) setThresholds(t => ({ ...t, ...data.thresholds }));
      setSaved("reset");
      setTimeout(() => setSaved(null), 2500);
    } catch {}
  }

  const TABS = [
    { id: "clinical", label: "Clinique",    icon: Activity },
    { id: "profile",  label: "Profil",      icon: User },
    { id: "model",    label: "Modèle CQL",  icon: Shield },
    { id: "system",   label: "Système",     icon: Settings },
  ] as const;

  const NumInput = ({ label, field, unit, min, max, step = 1 }: any) => (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--slate-700)", marginBottom: 5 }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="number" min={min} max={max} step={step}
          value={(thresholds as any)[field]}
          onChange={e => setThresholds(t => ({ ...t, [field]: +e.target.value }))}
          className="input" style={{ maxWidth: 120 }}
        />
        <span style={{ fontSize: 12, color: "var(--slate-400)" }}>{unit}</span>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }} className="animate-fade">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Paramètres</h1>
        <p style={{ fontSize: 12, color: "var(--slate-400)", marginTop: 2 }}>Configuration clinique et système</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "var(--slate-100)", borderRadius: 10, padding: 4, marginBottom: 20, width: "fit-content" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
              background: tab === t.id ? "white" : "transparent",
              color: tab === t.id ? "var(--brand)" : "var(--slate-500)",
              boxShadow: tab === t.id ? "var(--shadow-sm)" : "none",
              transition: "all 0.15s",
            }}>
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Save banner */}
      {saved && (
        <div className="animate-fade" style={{
          background: saved === "error" ? "var(--critical-bg)" : "var(--low-bg)",
          border: `1px solid ${saved === "error" ? "var(--critical)" : "var(--low)"}`,
          borderRadius: 10, padding: "10px 16px", marginBottom: 16,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <Check size={14} color={saved === "error" ? "var(--critical)" : "var(--low)"} />
          <p style={{ fontSize: 12, fontWeight: 600, color: saved === "error" ? "var(--critical)" : "var(--low)" }}>
            {saved === "error" ? "Erreur — backend non disponible. Paramètres sauvegardés localement." : "Paramètres sauvegardés avec succès."}
          </p>
        </div>
      )}

      {/* Clinical tab */}
      {tab === "clinical" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ padding: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)", marginBottom: 20 }}>Seuils Glycémiques</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
              <NumInput label="Seuil hypoglycémie" field="hypoglycemia_threshold" unit="mg/dL" min={50} max={90} />
              <NumInput label="Cible minimale" field="target_glucose_min" unit="mg/dL" min={100} max={160} />
              <NumInput label="Cible maximale" field="target_glucose_max" unit="mg/dL" min={140} max={220} />
            </div>
            <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--slate-50)", borderRadius: 8, fontSize: 11, color: "var(--slate-500)" }}>
              <strong>Correspondance g/L :</strong> Seuil hypo = {(thresholds.hypoglycemia_threshold/100).toFixed(2)} g/L · Cible = {(thresholds.target_glucose_min/100).toFixed(1)}–{(thresholds.target_glucose_max/100).toFixed(1)} g/L
            </div>
          </div>
          <div className="card" style={{ padding: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)", marginBottom: 20 }}>Dosage Insuline</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <NumInput label="Dose maximale autorisée" field="dose_max" unit="U" min={4} max={20} />
              <NumInput label="Intervalle monitoring" field="monitoring_interval_sec" unit="secondes" min={60} max={3600} step={60} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn btn-secondary" onClick={resetThresholds}><RefreshCw size={13} /> Réinitialiser</button>
            <button className="btn btn-primary" onClick={saveThresholds}><Save size={13} /> Sauvegarder</button>
          </div>
        </div>
      )}

      {/* Profile tab */}
      {tab === "profile" && (
        <div className="card" style={{ padding: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)", marginBottom: 20 }}>Profil Clinicien</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { label: "Nom du clinicien", field: "clinician_name" },
              { label: "Hôpital",          field: "hospital" },
              { label: "Service",          field: "department" },
            ].map(f => (
              <div key={f.field}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--slate-700)", marginBottom: 5 }}>{f.label}</label>
                <input className="input" value={(profile as any)[f.field]} onChange={e => setProfile(p => ({ ...p, [f.field]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--slate-700)", marginBottom: 5 }}>Langue</label>
              <select className="input" value={profile.language} onChange={e => setProfile(p => ({ ...p, language: e.target.value }))} style={{ cursor: "pointer" }}>
                <option value="fr">Français</option>
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--slate-700)", marginBottom: 5 }}>Unité glycémie</label>
              <select className="input" value={profile.glucose_unit} onChange={e => setProfile(p => ({ ...p, glucose_unit: e.target.value }))} style={{ cursor: "pointer" }}>
                <option value="mg/dL">mg/dL</option>
                <option value="g/L">g/L</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: 16, display: "flex", gap: 20 }}>
            {[
              { label: "Notifications activées", field: "notifications" },
              { label: "Recommandations auto",   field: "auto_recommend" },
            ].map(f => (
              <label key={f.field} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--slate-700)" }}>
                <input type="checkbox" checked={(profile as any)[f.field]} onChange={e => setProfile(p => ({ ...p, [f.field]: e.target.checked }))} style={{ width: 16, height: 16, accentColor: "var(--brand)" }} />
                {f.label}
              </label>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
            <button className="btn btn-primary" onClick={saveProfile}><Save size={13} /> Sauvegarder</button>
          </div>
        </div>
      )}

      {/* Model tab */}
      {tab === "model" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {modelInfo ? (
            <>
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)" }}>CQL Model — {modelInfo.version}</p>
                  <span className={`badge ${modelInfo.loaded ? "badge-low" : "badge-high"}`}>{modelInfo.loaded ? "✓ Chargé" : "⚠ Heuristique"}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Fichier", value: modelInfo.file },
                    { label: "Dimensions état", value: modelInfo.state_dim },
                    { label: "Actions", value: modelInfo.n_actions },
                    { label: "Dataset", value: modelInfo.training?.dataset || "MIMIC-IV" },
                    { label: "Algorithme", value: modelInfo.training?.algorithm || "CQL" },
                    { label: "CQL Alpha", value: modelInfo.training?.cql_alpha || 0.1 },
                  ].map(s => (
                    <div key={s.label} style={{ background: "var(--slate-50)", borderRadius: 8, padding: "10px 12px" }}>
                      <p style={{ fontSize: 10, color: "var(--slate-400)" }}>{s.label}</p>
                      <p style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--slate-900)" }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card" style={{ padding: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Performance Clinique</p>
                <div style={{ display: "flex", gap: 16 }}>
                  {Object.entries(modelInfo.performance || {}).map(([k, v]) => (
                    <div key={k} style={{ background: "var(--low-bg)", borderRadius: 10, padding: "12px 16px", border: "1px solid var(--low)" }}>
                      <p style={{ fontSize: 10, color: "var(--slate-400)" }}>{k.replace(/_/g," ")}</p>
                      <p style={{ fontSize: 16, fontWeight: 700, color: "var(--low)" }}>{v as string}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--slate-400)" }}>
              <Info size={32} style={{ opacity: 0.3, marginBottom: 10 }} />
              <p>Backend non disponible — informations modèle indisponibles</p>
              <p style={{ fontSize: 11, marginTop: 6 }}>Lancez le backend : <code style={{ fontFamily: "var(--font-mono)", background: "var(--slate-100)", padding: "2px 6px", borderRadius: 4 }}>uvicorn app.main:app --port 8000</code></p>
            </div>
          )}
        </div>
      )}

      {/* System tab */}
      {tab === "system" && (
        <div className="card" style={{ padding: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)", marginBottom: 20 }}>Informations Système</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "Application",   value: "IntelliGlu v2.0" },
              { label: "Algorithme",    value: "CQL Offline RL" },
              { label: "Frontend",      value: "Next.js 14 + TypeScript" },
              { label: "Backend",       value: "FastAPI + PyTorch" },
              { label: "API Docs",      value: "http://localhost:8000/docs" },
              { label: "Environnement", value: "Development" },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--slate-100)" }}>
                <span style={{ fontSize: 12, color: "var(--slate-500)" }}>{s.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--slate-900)" }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
