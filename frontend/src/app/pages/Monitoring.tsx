import React, { useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend, Cell,
} from "recharts";
import {
  AlertTriangle, CheckCircle, TrendingUp, Activity, Clock,
  Loader2, BarChart2, RefreshCw,
} from "lucide-react";
import { psiData, psiTrendData, modelPerformanceData } from "../data/mockData";

const API_BASE = "http://localhost:8000/api/v1";

// ── Types ──────────────────────────────────────────────────────────────────
interface FeatureItem {
  feature: string;
  importance: number;
}

interface ModelMeta {
  id: string;
  version: string;
  rawVersion: string;
  modelName: string;
  runId?: string | null;
  auc: number;
  f1: number;
  recall: number;
  precision: number;
  aliases: string[];
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3" style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 12 }}>
      <div style={{ fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: "#64748b" }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: "#0f172a" }}>
            {typeof p.value === "number" && p.value < 2 ? p.value.toFixed(3) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── PSI Status Badge ───────────────────────────────────────────────────────
function PSIStatusBadge({ status }: { status: string }) {
  const cfg = {
    OK:       { bg: "#dcfce7", color: "#16a34a", label: "OK" },
    WARNING:  { bg: "#fffbeb", color: "#d97706", label: "WARN" },
    CRITICAL: { bg: "#fee2e2", color: "#dc2626", label: "CRIT" },
  }[status] ?? { bg: "#f8fafc", color: "#94a3b8", label: status };
  return (
    <span className="px-2 py-0.5 rounded-md" style={{ background: cfg.bg, color: cfg.color, fontSize: 10, fontWeight: 700 }}>
      {cfg.label}
    </span>
  );
}

// ── Feature Importance Panel ───────────────────────────────────────────────
function FeatureImportancePanel({ models }: { models: ModelMeta[] }) {
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topN, setTopN] = useState(20);

  // Default: pick champion or first model
  useEffect(() => {
    if (!models.length) return;
    const champion = models.find(m => m.aliases.some(a => a.toLowerCase().includes("champion")));
    setSelectedModelId(champion?.id ?? models[0].id);
  }, [models]);

  const selectedModel = models.find(m => m.id === selectedModelId);

  const fetchFeatureImportance = async () => {
    if (!selectedModel?.runId) {
      setError("This model version has no associated run ID – it may have been trained before feature importance logging was added.");
      setFeatures([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        model_name: selectedModel.modelName || "RetainAI_XGBoost_Churn",
        run_id: selectedModel.runId,
      });
      const res = await fetch(`${API_BASE}/model-registry/feature-importance?${params}`);
      const data = await res.json();
      if (data.status === "error") throw new Error(data.message);
      setFeatures(data.features ?? []);
    } catch (err: any) {
      setError(err.message ?? "Failed to load feature importance");
      setFeatures([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedModelId) fetchFeatureImportance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModelId]);

  const displayed = features.slice(0, topN);
  const maxImportance = displayed.length ? displayed[0].importance : 1;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "white", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <BarChart2 size={18} className="text-indigo-500" />
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Feature Importance</h3>
          <span className="px-2 py-0.5 rounded-md text-xs font-semibold"
            style={{ background: "#eff0fe", color: "#6366f1" }}>
            Live from MLflow
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Top-N selector */}
          <select value={topN} onChange={e => setTopN(Number(e.target.value))}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 text-slate-600 outline-none">
            {[10, 15, 20, 30].map(n => <option key={n} value={n}>Top {n}</option>)}
          </select>
          {/* Model selector */}
          <select value={selectedModelId} onChange={e => setSelectedModelId(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 text-slate-600 outline-none max-w-[180px]">
            {models.map(m => (
              <option key={m.id} value={m.id}>
                {m.version} {m.aliases.some(a => a.toLowerCase().includes("champion")) ? "🏆" : ""}
              </option>
            ))}
          </select>
          <button onClick={fetchFeatureImportance}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
            title="Refresh">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Selected model metrics strip */}
      {selectedModel && (
        <div className="flex items-center gap-4 px-5 py-2 bg-slate-50 border-b border-slate-100">
          <span className="text-xs text-slate-500">
            Model: <strong className="text-slate-700">{selectedModel.version}</strong>
          </span>
          {[
            { label: "AUC",       value: selectedModel.auc,       pass: selectedModel.auc >= 0.8 },
            { label: "F1",        value: selectedModel.f1,        pass: selectedModel.f1 >= 0.75 },
            { label: "Recall",    value: selectedModel.recall,    pass: selectedModel.recall >= 0.8 },
            { label: "Precision", value: selectedModel.precision, pass: selectedModel.precision >= 0.7 },
          ].map(m => (
            <span key={m.label} className="text-xs font-semibold px-2 py-0.5 rounded-md"
              style={{ background: m.pass ? "#dcfce7" : "#fef2f2", color: m.pass ? "#16a34a" : "#dc2626" }}>
              {m.label}: {m.value.toFixed(3)}
            </span>
          ))}
        </div>
      )}

      {/* Body */}
      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-slate-400 text-sm">
            <Loader2 size={16} className="animate-spin text-indigo-400" /> Loading feature importance…
          </div>
        ) : error ? (
          <div className="py-8 px-4 rounded-xl text-center" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
            <AlertTriangle size={20} className="mx-auto mb-2 text-amber-500" />
            <p className="text-sm text-amber-700 font-medium">Feature importance unavailable</p>
            <p className="text-xs text-amber-600 mt-1">{error}</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            No feature importance data available for this model version.
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.map((f, i) => {
              const pct = (f.importance / maxImportance) * 100;
              const isTop5 = i < 5;
              return (
                <div key={f.feature} className="flex items-center gap-3 group">
                  {/* Rank */}
                  <div className="w-6 text-right text-xs font-bold flex-shrink-0"
                    style={{ color: isTop5 ? "#6366f1" : "#94a3b8" }}>
                    {i + 1}
                  </div>
                  {/* Feature name */}
                  <div className="w-52 flex-shrink-0 text-xs font-medium truncate"
                    style={{ color: isTop5 ? "#1e293b" : "#475569" }}
                    title={f.feature}>
                    {f.feature}
                  </div>
                  {/* Bar */}
                  <div className="flex-1 relative h-5 rounded-lg overflow-hidden"
                    style={{ background: "#f1f5f9" }}>
                    <div
                      className="h-full rounded-lg transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: isTop5
                          ? "linear-gradient(90deg, #6366f1, #8b5cf6)"
                          : "linear-gradient(90deg, #a5b4fc, #c4b5fd)",
                      }}
                    />
                  </div>
                  {/* Value */}
                  <div className="w-16 text-right text-xs font-semibold flex-shrink-0"
                    style={{ color: isTop5 ? "#6366f1" : "#64748b" }}>
                    {f.importance.toFixed(5)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Monitoring Page ────────────────────────────────────────────────────────
export function Monitoring() {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [registryModels, setRegistryModels] = useState<ModelMeta[]>([]);

  // Fetch model list for feature importance panel
  useEffect(() => {
    fetch(`${API_BASE}/model-registry`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setRegistryModels(data as ModelMeta[]); })
      .catch(() => {}); // silently ignore – feature importance is optional
  }, []);

  const overallStatus = psiData.some(d => d.status === "CRITICAL") ? "CRITICAL"
    : psiData.some(d => d.status === "WARNING") ? "WARNING" : "HEALTHY";

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className="flex items-center gap-4 px-5 py-4 rounded-2xl"
        style={{
          background: overallStatus === "CRITICAL" ? "linear-gradient(90deg, #fef2f2, #fff7ed)" : overallStatus === "WARNING" ? "#fffbeb" : "#f0fdf4",
          border: `1px solid ${overallStatus === "CRITICAL" ? "#fca5a5" : overallStatus === "WARNING" ? "#fde68a" : "#bbf7d0"}`,
        }}>
        {overallStatus === "CRITICAL"
          ? <AlertTriangle size={20} color="#ef4444" />
          : overallStatus === "WARNING"
          ? <AlertTriangle size={20} color="#f59e0b" />
          : <CheckCircle size={20} color="#10b981" />}
        <div className="flex-1">
          <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
            System Status:{" "}
            <span style={{ color: overallStatus === "CRITICAL" ? "#dc2626" : overallStatus === "WARNING" ? "#d97706" : "#16a34a" }}>
              {overallStatus}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {overallStatus === "CRITICAL"
              ? "Critical drift on 'internetService' (PSI=0.21). Auto-retrain triggered."
              : overallStatus === "WARNING"
              ? "Warning level drift on 'numServices'. Monitor closely."
              : "All features within acceptable drift limits."}
          </div>
        </div>
        <div className="flex items-center gap-2" style={{ color: "#94a3b8", fontSize: 12 }}>
          <Clock size={13} /> <span>Last check: 2026-03-30 07:45</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Overall PSI",       value: "0.21", sub: "Max across features",    icon: <Activity size={18} />,      color: "#ef4444" },
          { label: "Features Monitored",value: "8",    sub: `${psiData.filter(d => d.status === "OK").length} OK, ${psiData.filter(d => d.status !== "OK").length} Issues`, icon: <TrendingUp size={18} />, color: "#6366f1" },
          { label: "Model AUC (Live)",  value: "0.881", sub: "Production champion",   icon: <CheckCircle size={18} />,   color: "#10b981" },
          { label: "PSI Threshold",     value: "0.20", sub: "Retrain trigger level",   icon: <AlertTriangle size={18} />, color: "#f59e0b" },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-4 flex items-center gap-4"
            style={{ background: "white", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div className="flex items-center justify-center rounded-xl flex-shrink-0"
              style={{ width: 42, height: 42, background: `${k.color}18` }}>
              <span style={{ color: k.color }}>{k.icon}</span>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{k.value}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{k.label}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* PSI Chart + Table */}
      <div className="grid grid-cols-12 gap-4">
        {/* PSI by Feature */}
        <div className="col-span-12 lg:col-span-7 rounded-2xl p-5"
          style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>PSI by Feature</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={psiData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" domain={[0, 0.3]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="feature" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} width={110} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine x={0.1} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "Warn", position: "top", fontSize: 10, fill: "#f59e0b" }} />
              <ReferenceLine x={0.2} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "Critical", position: "top", fontSize: 10, fill: "#ef4444" }} />
              <Bar dataKey="psi" name="PSI" radius={[0, 4, 4, 0]}
                label={{ position: "right", fontSize: 11, fill: "#64748b", formatter: (v: number) => v.toFixed(2) }}>
                {psiData.map((d, i) => (
                  <Cell key={i} fill={d.status === "CRITICAL" ? "#ef4444" : d.status === "WARNING" ? "#f59e0b" : "#6366f1"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* PSI Status Table */}
        <div className="col-span-12 lg:col-span-5 rounded-2xl overflow-hidden"
          style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
          <div className="p-4 border-b" style={{ borderColor: "#f1f5f9" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Feature Drift Status</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                {["Feature", "PSI", "Status", "Progress"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left"
                    style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {psiData.map(d => (
                <tr key={d.feature} className="border-b" style={{ borderColor: "#f8fafc" }}>
                  <td className="px-4 py-3" style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>{d.feature}</td>
                  <td className="px-4 py-3" style={{ fontSize: 13, fontWeight: 700, color: d.status === "CRITICAL" ? "#ef4444" : d.status === "WARNING" ? "#f59e0b" : "#10b981" }}>
                    {d.psi.toFixed(2)}
                  </td>
                  <td className="px-4 py-3"><PSIStatusBadge status={d.status} /></td>
                  <td className="px-4 py-3" style={{ minWidth: 70 }}>
                    <div className="rounded-full overflow-hidden" style={{ height: 5, background: "#f1f5f9" }}>
                      <div className="h-full rounded-full"
                        style={{ width: `${(d.psi / 0.3) * 100}%`, background: d.status === "CRITICAL" ? "#ef4444" : d.status === "WARNING" ? "#f59e0b" : "#10b981" }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feature Importance – LIVE from MLflow */}
      <FeatureImportancePanel models={registryModels} />

      {/* PSI Trend + Model Performance */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-5 rounded-2xl p-5"
          style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>Overall PSI Trend (March)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={psiTrendData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 0.3]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0.1} stroke="#f59e0b" strokeDasharray="4 4" />
              <ReferenceLine y={0.2} stroke="#ef4444" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="psi" name="Overall PSI" stroke="#6366f1" strokeWidth={2.5}
                dot={{ r: 4, fill: "#6366f1" }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-12 lg:col-span-7 rounded-2xl p-5"
          style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>Model Performance Over Time</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={modelPerformanceData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0.7, 0.95]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine y={0.8} stroke="#f59e0b" strokeDasharray="4 4"
                label={{ value: "Recall target", fontSize: 10, fill: "#f59e0b", position: "right" }} />
              <Line type="monotone" dataKey="auc" name="AUC" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="f1" name="F1" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="recall" name="Recall" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}