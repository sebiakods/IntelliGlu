"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Bell, Search, RefreshCw, Wifi, WifiOff } from "lucide-react";

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard":       { title: "Dashboard",        subtitle: "Patient overview & AI recommendations" },
  "/patients":        { title: "Patients",          subtitle: "ICU patient management" },
  "/simulator":       { title: "CQL Simulator",     subtitle: "Offline RL glucose simulation" },
  "/recommendations": { title: "AI Recommendations",subtitle: "CQL-powered insulin dosing" },
  "/realtime":        { title: "Real-Time Monitor", subtitle: "Live glucose monitoring" },
  "/analytics":       { title: "Analytics",         subtitle: "Performance metrics & trends" },
  "/reports":         { title: "Reports",           subtitle: "Clinical reports & exports" },
  "/alerts":          { title: "Alerts",            subtitle: "Active alerts & notifications" },
  "/settings":        { title: "Settings",          subtitle: "System configuration" },
  "/help":            { title: "Help & Support",    subtitle: "Documentation & guides" },
};

export default function TopBar() {
  const path = usePathname();
  const [time, setTime] = useState(new Date());
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Check backend connectivity
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/v1/health", { signal: AbortSignal.timeout(2000) });
        setConnected(res.ok);
      } catch {
        setConnected(false);
      }
    };
    check();
    const t = setInterval(check, 15000);
    return () => clearInterval(t);
  }, []);

  const page = PAGE_TITLES[path] || { title: "IntelliGlu", subtitle: "ICU Glucose AI" };

  return (
    <header style={{
      height: 56, background: "#fff",
      borderBottom: "1px solid var(--slate-200)",
      display: "flex", alignItems: "center",
      padding: "0 20px", gap: 16, flexShrink: 0
    }}>
      {/* Page title */}
      <div style={{ flex: 1 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--slate-900)", lineHeight: 1 }}>
          {page.title}
        </h2>
        <p style={{ fontSize: 11, color: "var(--slate-400)", marginTop: 1 }}>{page.subtitle}</p>
      </div>

      {/* Search */}
      <div style={{ position: "relative" }}>
        <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--slate-400)" }} />
        <input
          placeholder="Search patients..."
          style={{
            paddingLeft: 30, paddingRight: 12, height: 32,
            border: "1px solid var(--slate-200)", borderRadius: 8,
            fontSize: 12, color: "var(--slate-700)", background: "var(--slate-50)",
            width: 180, outline: "none", fontFamily: "var(--font-sans)"
          }}
        />
      </div>

      {/* Backend status */}
      <div
        data-tooltip={connected ? "Backend connected" : "Backend offline"}
        style={{ display: "flex", alignItems: "center", gap: 5, cursor: "default" }}
      >
        {connected
          ? <Wifi size={14} color="var(--low)" />
          : <WifiOff size={14} color="var(--critical)" />
        }
        <span style={{ fontSize: 11, color: connected ? "var(--low)" : "var(--critical)", fontWeight: 600 }}>
          {connected ? "Live" : "Offline"}
        </span>
      </div>

      {/* Model badge */}
      <div style={{
        display: "flex", alignItems: "center", gap: 5,
        background: "var(--brand-light)", padding: "4px 10px",
        borderRadius: 99, fontSize: 11, color: "var(--brand)", fontWeight: 600
      }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--brand)", animation: "pulse 2s infinite" }} />
        CQL Model
      </div>

      {/* Clock */}
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--slate-500)", letterSpacing: "0.02em" }}>
        {time.toLocaleTimeString("fr-DZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>

      {/* Alerts bell */}
      <button style={{
        position: "relative", background: "none", border: "none",
        cursor: "pointer", padding: 6, borderRadius: 8,
        color: "var(--slate-500)", transition: "all 0.15s"
      }}
        onMouseEnter={e => (e.currentTarget.style.background = "var(--slate-100)")}
        onMouseLeave={e => (e.currentTarget.style.background = "none")}
      >
        <Bell size={16} />
        <span style={{
          position: "absolute", top: 2, right: 2,
          width: 7, height: 7, borderRadius: "50%",
          background: "var(--critical)", border: "1.5px solid #fff"
        }} />
      </button>
    </header>
  );
}
