import React, { useState } from "react";
import { AlertTriangle, Info, CheckCircle, Bell, BellOff, Filter } from "lucide-react";
import { alerts, Alert } from "../data/mockData";

const severityConfig = {
  critical: { bg: "#fef2f2", border: "#fecaca", dot: "#ef4444", icon: <AlertTriangle size={16} color="#ef4444" />, label: "Critical", labelColor: "#dc2626", labelBg: "#fee2e2" },
  warning: { bg: "#fffbeb", border: "#fde68a", dot: "#f59e0b", icon: <AlertTriangle size={16} color="#f59e0b" />, label: "Warning", labelColor: "#d97706", labelBg: "#fef3c7" },
  info: { bg: "#eff6ff", border: "#bfdbfe", dot: "#3b82f6", icon: <Info size={16} color="#3b82f6" />, label: "Info", labelColor: "#2563eb", labelBg: "#dbeafe" },
};

const typeConfig: Record<Alert["type"], { label: string; color: string }> = {
  DRIFT: { label: "Data Drift", color: "#8b5cf6" },
  RISK_TIER: { label: "Risk Tier Change", color: "#ef4444" },
  MODEL: { label: "Model Event", color: "#3b82f6" },
  SYSTEM: { label: "System", color: "#64748b" },
};

export function Alerts() {
  const [filterSeverity, setFilterSeverity] = useState<"all" | Alert["severity"]>("all");
  const [filterType, setFilterType] = useState<"all" | Alert["type"]>("all");
  const [localAlerts, setLocalAlerts] = useState(alerts);

  const filtered = localAlerts.filter((a) => {
    const matchSev = filterSeverity === "all" || a.severity === filterSeverity;
    const matchType = filterType === "all" || a.type === filterType;
    return matchSev && matchType;
  });

  const markRead = (id: string) => setLocalAlerts((prev) => prev.map((a) => a.id === id ? { ...a, read: true } : a));
  const markAllRead = () => setLocalAlerts((prev) => prev.map((a) => ({ ...a, read: true })));

  const unread = localAlerts.filter((a) => !a.read).length;

  return (
    <div className="space-y-4">
      {/* Summary + Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: unread > 0 ? "#fee2e2" : "#dcfce7", border: `1px solid ${unread > 0 ? "#fecaca" : "#bbf7d0"}` }}>
            <Bell size={14} color={unread > 0 ? "#ef4444" : "#16a34a"} />
            <span style={{ fontSize: 13, fontWeight: 600, color: unread > 0 ? "#dc2626" : "#15803d" }}>
              {unread > 0 ? `${unread} unread alert${unread > 1 ? "s" : ""}` : "All alerts read"}
            </span>
          </div>
          {unread > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: "white", border: "1px solid #e2e8f0", color: "#64748b", fontSize: 12, cursor: "pointer" }}>
              <BellOff size={13} /> Mark all read
            </button>
          )}
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>{filtered.length} alerts shown</div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5" style={{ color: "#94a3b8", fontSize: 12 }}>
          <Filter size={12} /> Severity:
        </div>
        {(["all", "critical", "warning", "info"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterSeverity(s)}
            className="px-3 py-1.5 rounded-lg cursor-pointer"
            style={{
              background: filterSeverity === s ? (s === "all" ? "#eff0fe" : s === "critical" ? "#fee2e2" : s === "warning" ? "#fef3c7" : "#dbeafe") : "white",
              color: filterSeverity === s ? (s === "all" ? "#6366f1" : s === "critical" ? "#dc2626" : s === "warning" ? "#d97706" : "#2563eb") : "#64748b",
              border: "1px solid #e2e8f0",
              fontSize: 12, fontWeight: filterSeverity === s ? 600 : 400, textTransform: "capitalize",
            }}
          >
            {s === "all" ? "All" : s}
          </button>
        ))}
        <div className="w-px mx-1" style={{ background: "#e2e8f0" }} />
        <div className="flex items-center gap-1.5" style={{ color: "#94a3b8", fontSize: 12 }}>Type:</div>
        {(["all", "DRIFT", "RISK_TIER", "MODEL", "SYSTEM"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className="px-3 py-1.5 rounded-lg cursor-pointer"
            style={{
              background: filterType === t ? "#eff0fe" : "white",
              color: filterType === t ? "#6366f1" : "#64748b",
              border: "1px solid #e2e8f0",
              fontSize: 12, fontWeight: filterType === t ? 600 : 400,
            }}
          >
            {t === "all" ? "All Types" : typeConfig[t as Alert["type"]]?.label ?? t}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filtered.map((alert) => {
          const sc = severityConfig[alert.severity];
          const tc = typeConfig[alert.type];
          return (
            <div
              key={alert.id}
              className="rounded-2xl p-5 flex items-start gap-4"
              style={{
                background: alert.read ? "white" : sc.bg,
                border: `1px solid ${alert.read ? "#f1f5f9" : sc.border}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                opacity: alert.read ? 0.75 : 1,
              }}
            >
              <div className="flex-shrink-0 mt-0.5">{sc.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-2 mb-1">
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{alert.title}</span>
                  {!alert.read && (
                    <span className="px-2 py-0.5 rounded" style={{ background: sc.dot, color: "white", fontSize: 9, fontWeight: 700 }}>NEW</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className="px-2 py-0.5 rounded-md" style={{ background: sc.labelBg, color: sc.labelColor, fontSize: 10, fontWeight: 700 }}>{sc.label.toUpperCase()}</span>
                  <span className="px-2 py-0.5 rounded-md" style={{ background: "#f1f5f9", color: tc.color, fontSize: 10, fontWeight: 600 }}>{tc.label}</span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>{alert.timestamp}</span>
                </div>
                <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>{alert.message}</p>
                {alert.actionRequired && !alert.read && (
                  <div className="mt-3 flex gap-2">
                    <button className="px-4 py-1.5 rounded-lg" style={{ background: sc.dot, color: "white", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer" }}>
                      Take Action
                    </button>
                    <button onClick={() => markRead(alert.id)} className="px-4 py-1.5 rounded-lg" style={{ background: "white", color: "#64748b", fontSize: 12, border: "1px solid #e2e8f0", cursor: "pointer" }}>
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                {alert.read ? (
                  <CheckCircle size={16} color="#10b981" />
                ) : (
                  <button onClick={() => markRead(alert.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 18 }}>×</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
