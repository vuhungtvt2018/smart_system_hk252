import React, { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from "recharts";
import { Download, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { churnTrendData, retentionData, contractDistribution, riskDistributionData } from "../data/mockData";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3" style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 12 }}>
      <div style={{ fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: "#64748b" }}>{p.name}:</span>
          <span style={{ fontWeight: 600, color: "#0f172a" }}>{p.value}{typeof p.value === "number" && (p.name?.toLowerCase().includes("rate") || p.name?.toLowerCase().includes("churn")) ? "%" : ""}</span>
        </div>
      ))}
    </div>
  );
};

export function Reports() {
  const [dateRange, setDateRange] = useState("6m");

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {["1m", "3m", "6m", "1y"].map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className="px-3 py-1.5 rounded-lg text-sm cursor-pointer"
              style={{
                background: dateRange === r ? "#6366f1" : "white",
                color: dateRange === r ? "white" : "#64748b",
                fontSize: 12, fontWeight: dateRange === r ? 600 : 400,
                border: "1px solid",
                borderColor: dateRange === r ? "#6366f1" : "#e2e8f0",
              }}
            >
              {r}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: "white", border: "1px solid #e2e8f0", color: "#475569", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
          <Download size={14} /> Export Report
        </button>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Avg Churn Rate", value: "25.8%", delta: "-1.7%", down: true, color: "#6366f1" },
          { label: "Total HIGH Risk", value: "172", delta: "+24 today", down: false, color: "#ef4444" },
          { label: "Retention Success", value: "65.5%", delta: "+2.6%", down: true, color: "#10b981" },
          { label: "Customers Retained", value: "108", delta: "of 165 contacted", down: true, color: "#f59e0b" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl p-5" style={{ background: "white", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>{k.label}</div>
            <div className="flex items-center gap-1 mt-1">
              {k.down ? <TrendingDown size={12} color="#16a34a" /> : <TrendingUp size={12} color="#ef4444" />}
              <span style={{ fontSize: 11, color: k.down ? "#16a34a" : "#ef4444", fontWeight: 600 }}>{k.delta}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-12 gap-4">
        {/* Churn Rate Trend */}
        <div className="col-span-12 lg:col-span-8 rounded-2xl p-5" style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>Monthly Churn Rate (%)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={churnTrendData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="cgChurn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis domain={[22, 30]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="churnRate" name="Churn Rate (%)" stroke="#6366f1" fill="url(#cgChurn)" strokeWidth={2.5} dot={{ r: 4, fill: "#6366f1" }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Contract Distribution */}
        <div className="col-span-12 lg:col-span-4 rounded-2xl p-5" style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>Contract Distribution</h3>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={contractDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                {contractDistribution.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {contractDistribution.map((d) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ background: d.color }} />
                  <span style={{ fontSize: 11, color: "#64748b" }}>{d.name}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-12 gap-4">
        {/* Retention Effectiveness */}
        <div className="col-span-12 lg:col-span-7 rounded-2xl p-5" style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>Retention Effectiveness</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={retentionData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="contacted" name="Contacted" fill="#c7d2fe" radius={[4, 4, 0, 0]} />
              <Bar dataKey="retained" name="Retained" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Retention Rate Trend */}
        <div className="col-span-12 lg:col-span-5 rounded-2xl p-5" style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>Retention Rate Trend (%)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={retentionData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis domain={[50, 75]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="retentionRate" name="Retention Rate (%)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: "#10b981" }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Risk Tier Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#f1f5f9" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Monthly Summary by Risk Tier</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
              {["Month", "Total Customers", "HIGH Risk", "MEDIUM Risk", "LOW Risk", "Churn Rate", "MoM Change"].map((h) => (
                <th key={h} className="px-5 py-3 text-left" style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {churnTrendData.map((row, i) => {
              const prev = churnTrendData[i - 1];
              const delta = prev ? row.churnRate - prev.churnRate : null;
              return (
                <tr key={row.month} className="border-b" style={{ borderColor: "#f8fafc" }}>
                  <td className="px-5 py-3" style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{row.month}</td>
                  <td className="px-5 py-3" style={{ fontSize: 13, color: "#475569" }}>{row.customers.toLocaleString()}</td>
                  <td className="px-5 py-3"><span style={{ fontSize: 13, fontWeight: 600, color: "#ef4444" }}>{row.highRisk}</span></td>
                  <td className="px-5 py-3"><span style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b" }}>{row.mediumRisk}</span></td>
                  <td className="px-5 py-3"><span style={{ fontSize: 13, fontWeight: 600, color: "#10b981" }}>{row.lowRisk}</span></td>
                  <td className="px-5 py-3" style={{ fontSize: 13, color: "#475569" }}>{row.churnRate}%</td>
                  <td className="px-5 py-3">
                    {delta !== null && (
                      <div className="flex items-center gap-1">
                        {delta < 0 ? <TrendingDown size={12} color="#16a34a" /> : <TrendingUp size={12} color="#dc2626" />}
                        <span style={{ fontSize: 12, fontWeight: 600, color: delta < 0 ? "#16a34a" : "#dc2626" }}>
                          {delta > 0 ? "+" : ""}{delta.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
