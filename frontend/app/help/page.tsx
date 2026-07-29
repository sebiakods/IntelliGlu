"use client";
import { useState, useEffect } from "react";
import { Search, BookOpen, HelpCircle, Code, Shield, Activity, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";

const API = "http://localhost:8000/api/v1";

const CAT_ICONS: Record<string, any> = {
  model:     Shield,
  clinical:  Activity,
  simulator: Activity,
  api:       Code,
  safety:    Shield,
};
const CAT_LABELS: Record<string, string> = {
  model:     "Modèle CQL",
  clinical:  "Clinique",
  simulator: "Simulateur",
  api:       "API",
  safety:    "Sécurité",
};

export default function HelpPage() {
  const [articles,  setArticles]  = useState<any[]>([]);
  const [faq,       setFaq]       = useState<any[]>([]);
  const [search,    setSearch]    = useState("");
  const [expanded,  setExpanded]  = useState<string | null>(null);
  const [selArt,    setSelArt]    = useState<any | null>(null);
  const [faqOpen,   setFaqOpen]   = useState<number | null>(null);
  const [backendOk, setBackendOk] = useState(false);

  useEffect(() => {
    fetch(`${API}/help/`)
      .then(r => r.json())
      .then(d => { setArticles(d.articles || []); setFaq(d.faq || []); setBackendOk(true); })
      .catch(() => {
        // Fallback local articles
        setArticles([
          { id:"cql-intro",    category:"model",    title:"Introduction au CQL",            summary:"Algorithme RL offline pour le dosage insuline.", tags:["CQL","RL"] },
          { id:"glucose-units",category:"clinical", title:"Unités mg/dL vs g/L",            summary:"Conversion et usage des deux unités.", tags:["glycémie"] },
          { id:"simulator",    category:"simulator",title:"Guide du Simulateur",             summary:"Utiliser le simulateur pour tester des scénarios.", tags:["simulateur"] },
          { id:"safety-rules", category:"safety",   title:"Règles de Sécurité CQL",         summary:"Protection clinique au-dessus de la politique.", tags:["sécurité"] },
        ]);
        setFaq([
          { q:"Pourquoi 0U à 4 g/L (400 mg/dL) ?",     a:"Bug corrigé en v2. La heuristique donne maintenant Action 5 (High 8U) pour tout glucose > 300 mg/dL." },
          { q:"Comment envoyer du simulateur aux recommandations ?", a:"Cliquer 'Envoyer aux Recommandations' dans le simulateur. Le résultat apparaît en bannière dans la page Recommandations." },
          { q:"Différence dataset vs nouveau patient ?", a:"Dataset = données MIMIC-IV (lecture seule). Nouveaux patients = ajoutés par cliniciens, stockés séparément." },
        ]);
      });
  }, []);

  const filteredArts = articles.filter(a =>
    !search || a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.summary.toLowerCase().includes(search.toLowerCase()) ||
    a.tags?.some((t: string) => t.toLowerCase().includes(search.toLowerCase()))
  );

  const categories = Array.from(new Set(articles.map(a => a.category)));

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }} className="animate-fade">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Aide & Documentation</h1>
        <p style={{ fontSize: 12, color: "var(--slate-400)", marginTop: 2 }}>
          Guides cliniques, référence API et FAQ IntelliGlu
          {backendOk && <span className="badge badge-low" style={{ marginLeft: 8 }}>Backend connecté</span>}
        </p>
      </div>

      {/* Search */}
      <div style={{ position: "relative", maxWidth: 500, marginBottom: 24 }}>
        <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--slate-400)" }} />
        <input className="input" style={{ paddingLeft: 36, height: 40 }} placeholder="Rechercher dans la documentation…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}>
        {/* Left nav */}
        <div>
          {categories.map(cat => {
            const Icon = CAT_ICONS[cat] || BookOpen;
            const arts = filteredArts.filter(a => a.category === cat);
            if (arts.length === 0) return null;
            return (
              <div key={cat} style={{ marginBottom: 4 }}>
                <button onClick={() => setExpanded(expanded === cat ? null : cat)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                    borderRadius: 8, border: "none", background: expanded === cat ? "var(--brand-light)" : "transparent",
                    color: expanded === cat ? "var(--brand)" : "var(--slate-700)", cursor: "pointer",
                    fontSize: 12, fontWeight: 600, transition: "all 0.13s",
                  }}>
                  <Icon size={13} />
                  <span style={{ flex: 1, textAlign: "left" }}>{CAT_LABELS[cat] || cat}</span>
                  {expanded === cat ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
                {(expanded === cat || !!search) && arts.map(a => (
                  <button key={a.id} onClick={() => setSelArt(a)}
                    style={{
                      width: "100%", padding: "6px 10px 6px 28px", borderRadius: 8, border: "none",
                      background: selArt?.id === a.id ? "var(--brand-light)" : "transparent",
                      color: selArt?.id === a.id ? "var(--brand)" : "var(--slate-600)",
                      cursor: "pointer", fontSize: 11.5, fontWeight: selArt?.id === a.id ? 600 : 400,
                      textAlign: "left", transition: "all 0.12s", marginBottom: 1,
                    }}>
                    {a.title}
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        {/* Right content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Article detail */}
          {selArt ? (
            <div className="card" style={{ padding: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <span className="badge badge-brand" style={{ marginBottom: 8 }}>{CAT_LABELS[selArt.category] || selArt.category}</span>
                  <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{selArt.title}</h2>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelArt(null)}>✕ Fermer</button>
              </div>
              <div style={{ fontSize: 13, color: "var(--slate-600)", lineHeight: 1.8, whiteSpace: "pre-line" }}>
                {selArt.content || selArt.summary}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
                {selArt.tags?.map((t: string) => (
                  <span key={t} className="badge badge-info">{t}</span>
                ))}
              </div>
            </div>
          ) : (
            /* Cards grid */
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {filteredArts.map(a => {
                const Icon = CAT_ICONS[a.category] || BookOpen;
                return (
                  <button key={a.id} onClick={() => { setSelArt(a); setExpanded(a.category); }}
                    style={{
                      background: "white", border: "1px solid var(--slate-200)", borderRadius: 12,
                      padding: 18, textAlign: "left", cursor: "pointer", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--brand)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "var(--shadow-md)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--slate-200)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--brand-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon size={14} color="var(--brand)" />
                      </div>
                      <span className="badge badge-brand">{CAT_LABELS[a.category] || a.category}</span>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--slate-900)", marginBottom: 5 }}>{a.title}</p>
                    <p style={{ fontSize: 11, color: "var(--slate-500)", lineHeight: 1.6 }}>{a.summary}</p>
                    <div style={{ display: "flex", gap: 4, marginTop: 10, flexWrap: "wrap" }}>
                      {a.tags?.slice(0,3).map((t: string) => <span key={t} className="badge badge-info" style={{ fontSize: 10 }}>{t}</span>)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* FAQ */}
          <div className="card" style={{ padding: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--slate-700)", marginBottom: 14 }}>
              <HelpCircle size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
              Questions Fréquentes
            </p>
            {faq.map((item, i) => (
              <div key={i} style={{ borderBottom: "1px solid var(--slate-100)", padding: "10px 0" }}>
                <button onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  style={{
                    width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: "none", border: "none", cursor: "pointer", textAlign: "left", gap: 10,
                  }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--slate-800)" }}>{item.q}</span>
                  {faqOpen === i ? <ChevronDown size={14} color="var(--slate-400)" /> : <ChevronRight size={14} color="var(--slate-400)" />}
                </button>
                {faqOpen === i && (
                  <p style={{ fontSize: 12, color: "var(--slate-600)", lineHeight: 1.7, marginTop: 8, paddingLeft: 4 }}>
                    {item.a}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* API link */}
          <div className="card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <Code size={18} color="var(--brand)" />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600 }}>Documentation API Interactive</p>
              <p style={{ fontSize: 11, color: "var(--slate-400)" }}>Swagger UI — testez les endpoints directement</p>
            </div>
            <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer">
              <button className="btn btn-secondary btn-sm"><ExternalLink size={12} /> Ouvrir Swagger</button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
