import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { PatientStoreProvider } from "@/lib/patientStore";

export const metadata: Metadata = {
  title: "IntelliGlu — ICU Glucose Management",
  description: "AI-powered insulin dosing — Offline RL (CQL)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{
        margin: 0, padding: 0,
        display: "flex",
        flexDirection: "row",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        background: "var(--slate-50)",
        fontFamily: "var(--font-sans)",
      }}>
        <PatientStoreProvider>
          {/* SIDEBAR — fixed left column */}
          <div style={{ flexShrink: 0, height: "100vh", overflowY: "auto", overflowX: "hidden" }}>
            <Sidebar />
          </div>

          {/* MAIN AREA — right of sidebar */}
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            overflow: "hidden",
            minWidth: 0,
          }}>
            {/* TOP BAR */}
            <div style={{ flexShrink: 0 }}>
              <TopBar />
            </div>

            {/* PAGE CONTENT */}
            <main style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              padding: "20px 24px",
            }}>
              {children}
            </main>
          </div>
        </PatientStoreProvider>
      </body>
    </html>
  );
}
