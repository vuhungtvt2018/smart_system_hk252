import React from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  Users, TrendingDown, TrendingUp, AlertTriangle, CheckCircle,
  Brain, Activity, ArrowUpRight, ArrowDownRight, Clock, Zap
} from "lucide-react";
import { kpiStats, churnTrendData, riskDistributionData, featureImportance, retentionData, modelPerformanceData, customers, alerts } from "../data/mockData";

const riskColor = { HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#10b981" };

function KpiCard({ icon, label, value, sub, trend, trendVal, color }: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; trend?: "up" | "down" | "neutral"; trendVal?: string; color: string;
}) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
      <div className="flex items-start justify-between">
        <div className="flex items-center justify-center rounded-xl" style={{ width: 42, height: 42, background: `${color}18` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        {trendVal && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: trend === "down" ? "#dcfce7" : trend === "up" ? "#fee2e2" : "#f1f5f9" }}>
            {trend === "down" ? <ArrowDownRight size={12} color="#16a34a" /> : trend === "up" ? <ArrowUpRight size={12} color="#dc2626" /> : null}
            <span style={{ fontSize: 11, fontWeight: 600, color: trend === "down" ? "#16a34a" : trend === "up" ? "#dc2626" : "#64748b" }}>{trendVal}</span>
          </div>
        )}
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>{children}</h2>;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3" style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 12 }}>
      <div style={{ fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: "#64748b" }}>{p.name}:</span>
          <span style={{ fontWeight: 600, color: "#0f172a" }}>{typeof p.value === "number" && p.value < 2 ? (p.value * 100).toFixed(1) + "%" : p.value}</span>
        </div>
      ))}
    </div>
  );
};

export function Dashboard() {
  const highRiskCustomers = customers.filter((c) => c.riskTier === "HIGH").slice(0, 5);
  const unreadAlerts = alerts.filter((a) => !a.read);

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {unreadAlerts.some((a) => a.severity === "critical") && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl" style={{ background: "linear-gradient(90deg, #fef2f2, #fff7ed)", border: "1px solid #fca5a5" }}>
          <AlertTriangle size={18} color="#ef4444" />
          <div className="flex-1">
            <span style={{ fontWeight: 600, color: "#dc2626", fontSize: 13 }}>Critical Alert: </span>
            <span style={{ color: "#92400e", fontSize: 13 }}>Data drift detected on 'internetService' (PSI=0.21). Auto-retrain triggered.</span>
          </div>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>07:45 today</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<Users size={20} />} label="Total Customers" value={kpiStats.totalCustomers.toLocaleString()} sub="Analyzed this cycle" color="#6366f1" />
        <KpiCard icon={<TrendingDown size={20} />} label="Churn Rate (Mar)" value={`${kpiStats.churnRateMonth}%`} sub={`Was ${kpiStats.churnRatePrev}% in Feb`} trend="down" trendVal="-0.9%" color="#ef4444" />
        <KpiCard icon={<AlertTriangle size={20} />} label="HIGH Risk" value={kpiStats.highRisk} sub="Priority retention contacts" trend="up" trendVal="+24 today" color="#ef4444" />
        <KpiCard icon={<Brain size={20} />} label="Model AUC" value={kpiStats.modelAUC} sub="XGBoost v2.3.1 · Production" trend="down" trendVal="+0.009" color="#6366f1" />
      </div>

      {/* Second row KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<CheckCircle size={20} />} label="Retention Rate" value={`${kpiStats.retentionRate}%`} sub="Inverse of churn rate" trend="down" trendVal="+0.9%" color="#10b981" />
        <KpiCard icon={<Activity size={20} />} label="Model Recall" value={kpiStats.modelRecall} sub="Target: ≥0.80 · PASSING" color="#10b981" />
        <KpiCard icon={<Activity size={20} />} label="Model F1" value={kpiStats.modelF1} sub="Target: ≥0.75 · PASSING" color="#f59e0b" />
        <KpiCard icon={<Clock size={20} />} label="Last Batch Run" value="05:00 AM" sub="Mar 30 · 1,043 processed" color="#3b82f6" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-12 gap-4">
        {/* Churn Rate Trend */}
        <div className="col-span-12 lg:col-span-8 rounded-2xl p-5" style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
          <SectionTitle>Churn Rate Trend (Last 6 Months)</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={churnTrendData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="cgHigh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cgMed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cgLow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="highRisk" name="HIGH" stroke="#ef4444" fill="url(#cgHigh)" strokeWidth={2} dot={{ r: 3, fill: "#ef4444" }} />
              <Area type="monotone" dataKey="mediumRisk" name="MEDIUM" stroke="#f59e0b" fill="url(#cgMed)" strokeWidth={2} dot={{ r: 3, fill: "#f59e0b" }} />
              <Area type="monotone" dataKey="lowRisk" name="LOW" stroke="#10b981" fill="url(#cgLow)" strokeWidth={2} dot={{ r: 3, fill: "#10b981" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Distribution Donut */}
        <div className="col-span-12 lg:col-span-4 rounded-2xl p-5" style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
          <SectionTitle>Risk Distribution</SectionTitle>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={riskDistributionData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                {riskDistributionData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} customers`, name]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-1">
            {riskDistributionData.map((d) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ background: d.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "#64748b" }}>{d.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{d.value}</span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>{((d.value / kpiStats.totalCustomers) * 100).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-12 gap-4">
        {/* Model Performance */}
        <div className="col-span-12 lg:col-span-7 rounded-2xl p-5" style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
          <SectionTitle>Model Performance (8-week trend)</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={modelPerformanceData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0.7, 0.95]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="auc" name="AUC" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="f1" name="F1" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="recall" name="Recall" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Feature Importance */}
        <div className="col-span-12 lg:col-span-5 rounded-2xl p-5" style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
          <SectionTitle>Top Feature Importance</SectionTitle>
          <div className="space-y-2.5 mt-1">
            {featureImportance.map((f, i) => (
              <div key={f.feature}>
                <div className="flex items-center justify-between mb-1">
                  <span style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>{f.feature}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{(f.importance * 100).toFixed(1)}%</span>
                </div>
                <div className="rounded-full overflow-hidden" style={{ height: 6, background: "#f1f5f9" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(f.importance / 0.182) * 100}%`,
                      background: i === 0 ? "#6366f1" : i === 1 ? "#8b5cf6" : i === 2 ? "#a78bfa" : i < 5 ? "#c4b5fd" : "#ddd6fe",
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-12 gap-4">
        {/* High Risk Customers */}
        <div className="col-span-12 lg:col-span-7 rounded-2xl p-5" style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>Top High-Risk Customers</SectionTitle>
            <a href="/customers" style={{ fontSize: 12, color: "#6366f1", fontWeight: 600 }}>View all →</a>
          </div>
          <div className="space-y-2">
            {highRiskCustomers.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "#fafafa", border: "1px solid #f1f5f9" }}>
                <div className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 34, height: 34, background: "#fee2e2" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#ef4444" }}>{c.name.split(" ").map((n) => n[0]).join("")}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{c.id} · {c.contract}</div>
                </div>
                <div className="text-right">
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#ef4444" }}>{(c.churnProbability * 100).toFixed(0)}%</div>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>churn prob.</div>
                </div>
                <div className="px-2 py-1 rounded-lg" style={{ background: "#fee2e2" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444" }}>HIGH</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="col-span-12 lg:col-span-5 rounded-2xl p-5" style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>Recent Alerts</SectionTitle>
            <a href="/alerts" style={{ fontSize: 12, color: "#6366f1", fontWeight: 600 }}>View all →</a>
          </div>
          <div className="space-y-2">
            {alerts.slice(0, 4).map((a) => {
              const colors = {
                critical: { bg: "#fef2f2", dot: "#ef4444", text: "#dc2626" },
                warning: { bg: "#fffbeb", dot: "#f59e0b", text: "#d97706" },
                info: { bg: "#eff6ff", dot: "#3b82f6", text: "#2563eb" },
              };
              const c = colors[a.severity];
              return (
                <div key={a.id} className="flex items-start gap-3 px-3 py-2.5 rounded-xl" style={{ background: c.bg }}>
                  <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: c.dot }} />
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }} className="truncate">{a.title}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{a.timestamp}</div>
                  </div>
                  {!a.read && (
                    <span className="flex-shrink-0 px-1.5 py-0.5 rounded" style={{ background: c.dot, color: "white", fontSize: 9, fontWeight: 700 }}>NEW</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
