import React, { useState } from "react";
import { GitBranch, CheckCircle, Clock, Archive, ArrowUp, RotateCcw, ChevronDown, ChevronUp, Cpu, TrendingUp } from "lucide-react";
import { modelVersions, ModelVersion, ModelStatus } from "../data/mockData";
import { useApp } from "../context/AppContext";

const statusConfig: Record<ModelStatus, { bg: string; color: string; icon: React.ReactNode }> = {
  Production: { bg: "#dcfce7", color: "#16a34a", icon: <CheckCircle size={12} /> },
  Staging: { bg: "#eff6ff", color: "#2563eb", icon: <Clock size={12} /> },
  Archived: { bg: "#f8fafc", color: "#94a3b8", icon: <Archive size={12} /> },
  Pending: { bg: "#fffbeb", color: "#d97706", icon: <Clock size={12} /> },
};

function MetricBadge({ label, value, pass }: { label: string; value: number; pass: boolean }) {
  return (
    <div className="text-center p-3 rounded-xl" style={{ background: pass ? "#dcfce7" : "#fef2f2", border: `1px solid ${pass ? "#bbf7d0" : "#fecaca"}` }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: pass ? "#16a34a" : "#dc2626" }}>{value.toFixed(3)}</div>
      <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
    </div>
  );
}

function ModelCard({ model, isExpanded, onToggle }: { model: ModelVersion; isExpanded: boolean; onToggle: () => void }) {
  const { currentRole } = useApp();
  const sc = statusConfig[model.status];
  const production = modelVersions.find((m) => m.status === "Production");
  const auc_delta = production && model.id !== production.id ? model.auc - production.auc : null;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "white",
        boxShadow: model.status === "Production" ? "0 4px 20px rgba(99,102,241,0.15)" : "0 1px 3px rgba(0,0,0,0.06)",
        border: model.status === "Production" ? "2px solid rgba(99,102,241,0.4)" : "1px solid #f1f5f9",
      }}
    >
      {model.status === "Production" && (
        <div className="px-4 py-1.5 flex items-center gap-2" style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }}>
          <CheckCircle size={12} color="white" />
          <span style={{ color: "white", fontSize: 11, fontWeight: 600 }}>LIVE PRODUCTION MODEL</span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-xl" style={{ width: 42, height: 42, background: model.status === "Production" ? "#eff0fe" : "#f8fafc" }}>
              <Cpu size={20} color={model.status === "Production" ? "#6366f1" : "#94a3b8"} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{model.version}</span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg" style={{ background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 600 }}>
                  {sc.icon}
                  {model.status}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>{model.algorithm}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {auc_delta !== null && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: auc_delta > 0 ? "#dcfce7" : "#fef2f2" }}>
                <TrendingUp size={12} color={auc_delta > 0 ? "#16a34a" : "#dc2626"} />
                <span style={{ fontSize: 11, fontWeight: 700, color: auc_delta > 0 ? "#16a34a" : "#dc2626" }}>
                  {auc_delta > 0 ? "+" : ""}{(auc_delta * 100).toFixed(1)}% AUC
                </span>
              </div>
            )}
            <button onClick={onToggle} className="flex items-center justify-center rounded-lg" style={{ width: 28, height: 28, background: "#f8fafc" }}>
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

        <div className="flex items-center gap-4 text-sm" style={{ color: "#94a3b8", fontSize: 11 }}>
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
                Promoted by <strong style={{ color: "#475569" }}>{model.promotedBy}</strong> on {model.promotedAt}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-4" style={{ borderTop: "1px solid #f1f5f9" }}>
          {model.status === "Staging" && (currentRole === "Admin" || currentRole === "ML Engineer") && (
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-xl"
              style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6)", color: "white", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer" }}
            >
              <ArrowUp size={13} />
              {currentRole === "Admin" ? "Promote to Production" : "Request Promotion"}
            </button>
          )}
          {model.status === "Production" && currentRole === "Admin" && (
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-xl"
              style={{ background: "#fef2f2", color: "#dc2626", fontSize: 12, fontWeight: 600, border: "1px solid #fecaca", cursor: "pointer" }}
            >
              <RotateCcw size={13} />
              Rollback
            </button>
          )}
          {model.status === "Archived" && currentRole === "Admin" && (
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-xl"
              style={{ background: "#f8fafc", color: "#64748b", fontSize: 12, fontWeight: 600, border: "1px solid #e2e8f0", cursor: "pointer" }}
            >
              <RotateCcw size={13} />
              Restore
            </button>
          )}
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-xl ml-auto"
            style={{ background: "#f8fafc", color: "#64748b", fontSize: 12, fontWeight: 600, border: "1px solid #e2e8f0", cursor: "pointer" }}
          >
            View in MLflow ↗
          </button>
        </div>
      </div>
    </div>
  );
}

export function ModelRegistry() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [filterStatus, setFilterStatus] = useState<ModelStatus | "ALL">("ALL");

  const filtered = filterStatus === "ALL" ? modelVersions : modelVersions.filter((m) => m.status === filterStatus);
  const sorted = [...filtered].sort((a, b) => {
    const order: Record<ModelStatus, number> = { Production: 0, Staging: 1, Pending: 2, Archived: 3 };
    return order[a.status] - order[b.status];
  });

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Versions", value: modelVersions.length, color: "#6366f1" },
          { label: "Production", value: modelVersions.filter((m) => m.status === "Production").length, color: "#16a34a" },
          { label: "Staging", value: modelVersions.filter((m) => m.status === "Staging").length, color: "#2563eb" },
          { label: "Archived", value: modelVersions.filter((m) => m.status === "Archived").length, color: "#94a3b8" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-4 flex items-center gap-4" style={{ background: "white", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div className="flex items-center justify-center rounded-xl" style={{ width: 42, height: 42, background: `${s.color}18` }}>
              <GitBranch size={18} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        {(["ALL", "Production", "Staging", "Archived"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className="px-4 py-2 rounded-xl text-sm cursor-pointer"
            style={{
              background: filterStatus === s ? (s === "Production" ? "#dcfce7" : s === "Staging" ? "#eff6ff" : s === "Archived" ? "#f8fafc" : "#eff0fe") : "white",
              color: filterStatus === s ? (s === "Production" ? "#16a34a" : s === "Staging" ? "#2563eb" : s === "Archived" ? "#94a3b8" : "#6366f1") : "#64748b",
              border: "1px solid",
              borderColor: filterStatus === s ? (s === "Production" ? "#bbf7d0" : s === "Staging" ? "#bfdbfe" : "#e2e8f0") : "#e2e8f0",
              fontSize: 13, fontWeight: filterStatus === s ? 600 : 400,
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Model Cards */}
      <div className="space-y-4">
        {sorted.map((model) => (
          <ModelCard
            key={model.id}
            model={model}
            isExpanded={!!expanded[model.id]}
            onToggle={() => setExpanded((prev) => ({ ...prev, [model.id]: !prev[model.id] }))}
          />
        ))}
      </div>
    </div>
  );
}
