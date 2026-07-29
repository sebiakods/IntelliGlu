"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Activity, Brain, BarChart3,
  FileText, Bell, Settings, HelpCircle, ChevronLeft, Droplets, Zap
} from "lucide-react";

const NAV = [
  { href: "/dashboard",       icon: LayoutDashboard, label: "Dashboard",        group: "clinical" },
  { href: "/patients",        icon: Users,            label: "Patients",         group: "clinical" },
  { href: "/simulator",       icon: Activity,         label: "Simulateur",       group: "clinical" },
  { href: "/recommendations", icon: Brain,            label: "Recommandations",  group: "clinical" },
  { href: "/realtime",        icon: Zap,              label: "Temps Réel",       group: "clinical" },
  { href: "/analytics",       icon: BarChart3,        label: "Analytique",       group: "insights" },
  { href: "/reports",         icon: FileText,         label: "Rapports",         group: "insights" },
  { href: "/alerts",          icon: Bell,             label: "Alertes",          badge: "3", group: "insights" },
  { href: "/settings",        icon: Settings,         label: "Paramètres",       group: "system" },
  { href: "/help",            icon: HelpCircle,       label: "Aide",             group: "system" },
];

const GROUP_LABELS: Record<string, string> = {
  clinical: "Clinique",
  insights: "Analyse",
  system:   "Système",
};

export default function Sidebar() {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const w = collapsed ? 60 : 216;

  return (
    <aside style={{
      width: w,
      minWidth: w,
      maxWidth: w,
      height: "100vh",
      background: "#0F172A",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      transition: "width 0.22s cubic-bezier(0.4,0,0.2,1), min-width 0.22s, max-width 0.22s",
      borderRight: "1px solid rgba(255,255,255,0.05)",
      position: "relative",
      zIndex: 10,
    }}>
      {/* Logo */}
      <div style={{
        height: 56,
        display: "flex",
        alignItems: "center",
        padding: collapsed ? "0 14px" : "0 16px",
        gap: 10,
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        flexShrink: 0,
        overflow: "hidden",
      }}>
        <div style={{
          width: 30, height: 30, minWidth: 30,
          borderRadius: 8,
          background: "linear-gradient(135deg, #1B4FE4 0%, #4F7AF8 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Droplets size={15} color="#fff" />
        </div>
        {!collapsed && (
          <div style={{ overflow: "hidden" }}>
            <p style={{ color: "#fff", fontWeight: 700, fontSize: 14, lineHeight: 1, whiteSpace: "nowrap" }}>
              IntelliGlu
            </p>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, marginTop: 2, whiteSpace: "nowrap" }}>
              ICU Glucose AI
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto", overflowX: "hidden" }}>
        {["clinical", "insights", "system"].map(group => {
          const items = NAV.filter(n => n.group === group);
          return (
            <div key={group} style={{ marginBottom: 4 }}>
              {!collapsed && (
                <p style={{
                  fontSize: 9.5, fontWeight: 700, letterSpacing: "0.09em",
                  color: "rgba(255,255,255,0.22)", textTransform: "uppercase",
                  padding: "8px 8px 4px", whiteSpace: "nowrap",
                }}>
                  {GROUP_LABELS[group]}
                </p>
              )}
              {items.map(item => {
                const active = path === item.href || (item.href !== "/" && path.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href} style={{ textDecoration: "none", display: "block" }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      padding: collapsed ? "9px 15px" : "9px 10px",
                      borderRadius: 8,
                      marginBottom: 2,
                      cursor: "pointer",
                      background: active ? "rgba(27,79,228,0.22)" : "transparent",
                      position: "relative",
                      transition: "background 0.13s",
                      overflow: "hidden",
                    }}
                      onMouseEnter={e => {
                        if (!active) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.07)";
                      }}
                      onMouseLeave={e => {
                        if (!active) (e.currentTarget as HTMLDivElement).style.background = "transparent";
                      }}
                    >
                      {/* Active indicator */}
                      {active && (
                        <div style={{
                          position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
                          width: 3, height: 20, background: "#4F7AF8", borderRadius: "0 3px 3px 0",
                        }} />
                      )}
                      <item.icon
                        size={15}
                        style={{ flexShrink: 0 }}
                        color={active ? "#7AA2FB" : "rgba(255,255,255,0.4)"}
                      />
                      {!collapsed && (
                        <>
                          <span style={{
                            fontSize: 12.5, fontWeight: active ? 600 : 400,
                            color: active ? "#fff" : "rgba(255,255,255,0.55)",
                            flex: 1, whiteSpace: "nowrap", overflow: "hidden",
                          }}>
                            {item.label}
                          </span>
                          {item.badge && (
                            <span style={{
                              background: "#DC2626", color: "#fff",
                              fontSize: 9.5, fontWeight: 700,
                              padding: "1px 5px", borderRadius: 9999,
                              lineHeight: 1.5,
                            }}>
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </Link>
                );
              })}
              {group !== "system" && (
                <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "6px 4px" }} />
              )}
            </div>
          );
        })}
      </nav>

      {/* Collapse button */}
      <div style={{
        padding: "10px 12px",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        display: "flex",
        justifyContent: collapsed ? "center" : "flex-end",
        flexShrink: 0,
      }}>
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "none", borderRadius: 6,
            padding: "6px 7px",
            cursor: "pointer",
            display: "flex", alignItems: "center",
            color: "rgba(255,255,255,0.4)",
            transition: "background 0.13s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
        >
          <ChevronLeft
            size={13}
            style={{
              transform: collapsed ? "rotate(180deg)" : "none",
              transition: "transform 0.22s",
            }}
          />
        </button>
      </div>
    </aside>
  );
}
