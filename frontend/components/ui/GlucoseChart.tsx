"use client";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine
} from "recharts";
import type { GlucosePoint } from "@/data/mockData";

interface Props { data: GlucosePoint[]; height?: number; }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    const g = payload[0].value;
    const color = g < 70 ? "#DC2626" : g > 180 ? "#EA580C" : "#16A34A";
    return (
      <div style={{
        background:"white", border:"1px solid #E2E8F0",
        borderRadius:8, padding:"6px 10px", fontSize:12
      }}>
        <p style={{ color:"#94A3B8" }}>{label}</p>
        <p style={{ fontWeight:700, color }}>{g} mg/dL</p>
      </div>
    );
  }
  return null;
};

export default function GlucoseChart({ data, height = 220 }: Props) {
  const ticks = data.filter((_, i) => i % 8 === 0).map(d => d.time);
  return (
    <div style={{ fontSize:11 }}>
      {/* Legend */}
      <div style={{ display:"flex", gap:16, marginBottom:8, flexWrap:"wrap" }}>
        {[
          { color:"#3B82F6", label:"Glucose (mg/dL)", dash:false },
          { color:"#86EFAC", label:"Target Range (140–180)", dash:false },
          { color:"#FCA5A5", label:"Hypoglycemia (<70)", dash:true },
        ].map(l => (
          <div key={l.label} style={{ display:"flex", alignItems:"center", gap:4 }}>
            <div style={{
              width:20, height:2,
              background: l.dash ? "none" : l.color,
              borderTop: l.dash ? `2px dashed ${l.color}` : "none"
            }} />
            <span style={{ color:"#64748B" }}>{l.label}</span>
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top:5, right:5, left:-20, bottom:0 }}>
          <defs>
            <linearGradient id="glucoseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#86EFAC" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#86EFAC" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
          <XAxis dataKey="time" ticks={ticks} tick={{ fontSize:10, fill:"#94A3B8" }} axisLine={false} tickLine={false} />
          <YAxis domain={[0,360]} ticks={[0,50,100,150,200,250,300,350]} tick={{ fontSize:10, fill:"#94A3B8" }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          {/* Target band */}
          <ReferenceLine y={180} stroke="#86EFAC" strokeWidth={1} strokeDasharray="0" />
          <ReferenceLine y={140} stroke="#86EFAC" strokeWidth={1} />
          {/* Hypoglycemia line */}
          <ReferenceLine y={70} stroke="#FCA5A5" strokeWidth={1.5} strokeDasharray="4 4" />
          <Area type="monotone" dataKey="glucose" stroke="#3B82F6" strokeWidth={2}
            fill="url(#glucoseGrad)" dot={false} activeDot={{ r:4, fill:"#3B82F6" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}