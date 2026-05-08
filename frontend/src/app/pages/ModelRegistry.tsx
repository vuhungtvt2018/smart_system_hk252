import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  GitBranch, CheckCircle, Archive, ArrowUp, RotateCcw, ChevronDown, ChevronUp,
  Cpu, TrendingUp, Tag, Search, Filter, Loader2, X,
} from "lucide-react";
import { useApp } from "../context/AppContext";

const API_BASE = "http://localhost:8000/api/v1/model-registry";

// ── Types ──────────────────────────────────────────────────────────────────
export interface ModelVersion {
  id: string;
  version: string;
  rawVersion: string;
  modelName: string;
  runId?: string | null;
  aliases: string[];
  tags: string[];
  auc: number;
  f1: number;
  recall: number;
  precision: number;
  trainedAt: string;
  trainedBy: string;
  datasetVersion: string;
  algorithm: string;
  notes: string;
  promotedBy?: string;
  promotedAt?: string;
}

// ── Toast ──────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold"
      style={{
        background: type === "success" ? "#f0fdf4" : "#fef2f2",
        border: `1px solid ${type === "success" ? "#bbf7d0" : "#fecaca"}`,
        color: type === "success" ? "#16a34a" : "#dc2626",
        minWidth: 280,
      }}
    >
      {type === "success" ? <CheckCircle size={16} /> : <X size={16} />}
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100"><X size={14} /></button>
    </div>
  );
}

// ── Alias badge ────────────────────────────────────────────────────────────
const getAliasStyle = (alias: string) => {
  const n = alias.toLowerCase();
  if (n.includes("champion") || n.includes("production"))
    return { bg: "#dcfce7", color: "#16a34a", icon: <CheckCircle size={12} /> };
  if (n.includes("challenger") || n.includes("staging"))
    return { bg: "#eff6ff", color: "#2563eb", icon: <ArrowUp size={12} /> };
  if (n.includes("archived"))
    return { bg: "#f8fafc", color: "#94a3b8", icon: <Archive size={12} /> };
  if (n === "default")
    return { bg: "#fffbeb", color: "#d97706", icon: <GitBranch size={12} /> };
  return { bg: "#f3f4f6", color: "#4b5563", icon: <Tag size={12} /> };
};

// ── MetricBadge ────────────────────────────────────────────────────────────
function MetricBadge({ label, value, pass }: { label: string; value: number; pass: boolean }) {
  return (
    <div className="text-center p-3 rounded-xl"
      style={{ background: pass ? "#dcfce7" : "#fef2f2", border: `1px solid ${pass ? "#bbf7d0" : "#fecaca"}` }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: pass ? "#16a34a" : "#dc2626" }}>
        {value.toFixed(3)}
      </div>
      <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
    </div>
  );
}

// ── ModelCard ──────────────────────────────────────────────────────────────
function ModelCard({
  model, models, isExpanded, onToggle, onRefresh, onToast,
}: {
  model: ModelVersion;
  models: ModelVersion[];
  isExpanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
  onToast: (msg: string, type: "success" | "error") => void;
}) {
  const { currentRole } = useApp();
  const [actionLoading, setActionLoading] = useState(false);

  const isChampion = model.aliases.some(
    a => a.toLowerCase().includes("champion") || a.toLowerCase().includes("production")
  );
  const championModel = models.find(m =>
    m.aliases.some(a => a.toLowerCase().includes("champion") || a.toLowerCase().includes("production"))
  );
  const auc_delta = championModel && model.id !== championModel.id
    ? model.auc - championModel.auc : null;

  const handleSetChampion = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/set-alias`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_name: model.modelName || "RetainAI_XGBoost_Churn",
          version: model.rawVersion,
          alias: "champion",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.status === "error") throw new Error(data.detail || data.message || "Failed");
      onToast(`✅ ${model.version} is now the Champion model`, "success");
      onRefresh();
    } catch (err: any) {
      onToast(`❌ ${err.message}`, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveChampion = async () => {
    setActionLoading(true);
    try {
      const modelName = encodeURIComponent(model.modelName || "RetainAI_XGBoost_Churn");
      const alias = encodeURIComponent("champion");
      const res = await fetch(`${API_BASE}/remove-alias?model_name=${modelName}&alias=${alias}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || data.status === "error") throw new Error(data.detail || data.message || "Failed");
      onToast(`Champion alias removed from ${model.version}`, "success");
      onRefresh();
    } catch (err: any) {
      onToast(`❌ ${err.message}`, "error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "white",
        boxShadow: isChampion ? "0 4px 20px rgba(99,102,241,0.15)" : "0 1px 3px rgba(0,0,0,0.06)",
        border: isChampion ? "2px solid rgba(99,102,241,0.4)" : "1px solid #f1f5f9",
      }}
    >
      {isChampion && (
        <div className="px-4 py-1.5 flex items-center gap-2"
          style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }}>
          <CheckCircle size={12} color="white" />
          <span style={{ color: "white", fontSize: 11, fontWeight: 600 }}>CHAMPION MODEL</span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-xl"
              style={{ width: 42, height: 42, background: isChampion ? "#eff0fe" : "#f8fafc" }}>
              <Cpu size={20} color={isChampion ? "#6366f1" : "#94a3b8"} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{model.version}</span>
                {model.aliases.map((alias, idx) => {
                  const style = getAliasStyle(alias);
                  return (
                    <span key={idx} className="flex items-center gap-1 px-2 py-0.5 rounded-lg"
                      style={{ background: style.bg, color: style.color, fontSize: 11, fontWeight: 600 }}>
                      {style.icon} {alias}
                    </span>
                  );
                })}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                {model.algorithm}
                {model.tags.length > 0 && model.tags[0] !== "Default" && (
                  <span className="flex items-center gap-1">
                    <Tag size={10} /> {model.tags.join(", ")}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {auc_delta !== null && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
                style={{ background: auc_delta > 0 ? "#dcfce7" : "#fef2f2" }}>
                <TrendingUp size={12} color={auc_delta > 0 ? "#16a34a" : "#dc2626"} />
                <span style={{ fontSize: 11, fontWeight: 700, color: auc_delta > 0 ? "#16a34a" : "#dc2626" }}>
                  {auc_delta > 0 ? "+" : ""}{(auc_delta * 100).toFixed(1)}% AUC
                </span>
              </div>
            )}
            <button onClick={onToggle}
              className="flex items-center justify-center rounded-lg"
              style={{ width: 28, height: 28, background: "#f8fafc" }}>
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <MetricBadge label="AUC" value={model.auc} pass={model.auc >= 0.8} />
          <MetricBadge label="F1" value={model.f1} pass={model.f1 >= 0.75} />
          <MetricBadge label="Recall" value={model.recall} pass={model.recall >= 0.8} />
          <MetricBadge label="Precision" value={model.precision} pass={model.precision >= 0.7} />
        </div>

        <div className="flex items-center gap-4" style={{ color: "#94a3b8", fontSize: 11 }}>
          <span>Trained: {model.trainedAt}</span>
          <span>By: {model.trainedBy}</span>
          <span>Dataset: {model.datasetVersion}</span>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid #f1f5f9" }}>
            <div className="mb-3 px-3 py-2.5 rounded-xl" style={{ background: "#f8fafc" }}>
              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>Notes</div>
              <div style={{ fontSize: 13, color: "#475569" }}>{model.notes}</div>
            </div>
            {model.promotedBy && (
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                Modified by <strong style={{ color: "#475569" }}>{model.promotedBy}</strong> on {model.promotedAt}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-4" style={{ borderTop: "1px solid #f1f5f9" }}>
          {currentRole === "Admin" && !isChampion && (
            <button
              onClick={handleSetChampion}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-opacity disabled:opacity-60"
              style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6)", color: "white", border: "none", cursor: actionLoading ? "not-allowed" : "pointer" }}
            >
              {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <ArrowUp size={13} />}
              Set as Champion
            </button>
          )}
          {currentRole === "Admin" && isChampion && (
            <button
              onClick={handleRemoveChampion}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-opacity disabled:opacity-60"
              style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", cursor: actionLoading ? "not-allowed" : "pointer" }}
            >
              {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
              Remove Champion Alias
            </button>
          )}
          <a
            href={`http://localhost:5000`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl ml-auto text-xs font-semibold"
            style={{ background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0" }}
          >
            View in MLflow ↗
          </a>
        </div>
      </div>
    </div>
  );
}

// ── ModelRegistry Page ─────────────────────────────────────────────────────
export function ModelRegistry() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [searchAlias, setSearchAlias] = useState("");
  const [filterTag, setFilterTag] = useState("ALL");
  const [models, setModels] = useState<ModelVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchModels = useCallback(() => {
    setLoading(true);
    fetch(API_BASE)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setModels(data);
        else console.error("API returned non-array data:", data);
      })
      .catch(err => console.error("Error fetching models:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchModels(); }, [fetchModels]);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    models.forEach(m => m.tags.forEach(t => { if (t !== "Default") tags.add(t); }));
    return Array.from(tags);
  }, [models]);

  const filtered = models.filter(m => {
    const matchAlias = searchAlias === "" || m.aliases.some(a => a.toLowerCase().includes(searchAlias.toLowerCase()));
    const matchTag = filterTag === "ALL" || m.tags.includes(filterTag);
    return matchAlias && matchTag;
  });

  const sorted = [...filtered].sort((a, b) => {
    const aChamp = a.aliases.some(al => al.toLowerCase().includes("champion"));
    const bChamp = b.aliases.some(al => al.toLowerCase().includes("champion"));
    if (aChamp && !bChamp) return -1;
    if (!aChamp && bChamp) return 1;
    return b.version.localeCompare(a.version);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-slate-500">
        <Loader2 size={20} className="animate-spin text-indigo-500" />
        Loading models from MLflow…
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="text-center py-12 rounded-2xl border border-slate-200 bg-white text-slate-500">
        No models found in the registry. Run the training pipeline to register a model.
      </div>
    );
  }

  const championCount = models.filter(m => m.aliases.some(a => a.toLowerCase().includes("champion"))).length;
  const taggedCount   = models.filter(m => m.tags.some(t => t !== "Default")).length;

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Versions",  value: models.length,  color: "#6366f1", icon: <GitBranch size={18} color="#6366f1" /> },
          { label: "Champion Models", value: championCount,   color: "#16a34a", icon: <CheckCircle size={18} color="#16a34a" /> },
          { label: "Tagged Models",   value: taggedCount,     color: "#2563eb", icon: <Tag size={18} color="#2563eb" /> },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4 flex items-center gap-4"
            style={{ background: "white", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div className="flex items-center justify-center rounded-xl"
              style={{ width: 42, height: 42, background: `${s.color}18` }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex-1 flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search by alias (e.g. champion, challenger)…"
            value={searchAlias}
            onChange={e => setSearchAlias(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full text-slate-700"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <select value={filterTag} onChange={e => setFilterTag(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none">
            <option value="ALL">All Tags</option>
            {uniqueTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
          </select>
        </div>
      </div>

      {/* Model Cards */}
      <div className="space-y-4">
        {sorted.length === 0 ? (
          <div className="text-center py-10 rounded-2xl border border-slate-200 bg-white text-slate-400 text-sm">
            No models match the current filters.
          </div>
        ) : sorted.map(model => (
          <ModelCard
            key={model.id}
            model={model}
            models={models}
            isExpanded={!!expanded[model.id]}
            onToggle={() => setExpanded(prev => ({ ...prev, [model.id]: !prev[model.id] }))}
            onRefresh={fetchModels}
            onToast={showToast}
          />
        ))}
      </div>
    </div>
  );
}
