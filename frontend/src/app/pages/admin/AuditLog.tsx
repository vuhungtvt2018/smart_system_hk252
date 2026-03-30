import React, { useState } from "react";
import { Search, Download, Filter, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { auditLog, AuditEntry, UserRole } from "../../data/mockData";

const statusConfig = {
  SUCCESS: { bg: "#dcfce7", color: "#16a34a", icon: <CheckCircle size={12} /> },
  FAILED: { bg: "#fee2e2", color: "#dc2626", icon: <XCircle size={12} /> },
  WARNING: { bg: "#fef3c7", color: "#d97706", icon: <AlertTriangle size={12} /> },
};

const actionColors: Record<string, { bg: string; color: string }> = {
  MODEL_PROMOTE: { bg: "#eff0fe", color: "#6366f1" },
  MODEL_SUBMIT: { bg: "#f0f9ff", color: "#0284c7" },
  CONFIG_UPDATE: { bg: "#fef3c7", color: "#d97706" },
  PREDICT_BATCH: { bg: "#f0fdf4", color: "#16a34a" },
  USER_CREATE: { bg: "#f5f3ff", color: "#7c3aed" },
  REPORT_EXPORT: { bg: "#f0f9ff", color: "#0891b2" },
  LOGIN_FAILED: { bg: "#fee2e2", color: "#dc2626" },
  TRAINING_RUN: { bg: "#eff0fe", color: "#6366f1" },
  SCHEDULE_UPDATE: { bg: "#fef3c7", color: "#d97706" },
  PREDICT_ONDEMAND: { bg: "#f0fdf4", color: "#16a34a" },
};

const roleConfig: Record<UserRole, { color: string; bg: string }> = {
  Admin: { color: "#6366f1", bg: "#eff0fe" },
  "Business User": { color: "#10b981", bg: "#dcfce7" },
  "ML Engineer": { color: "#f59e0b", bg: "#fef3c7" },
};

export function AuditLog() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | AuditEntry["status"]>("ALL");
  const [filterRole, setFilterRole] = useState<"ALL" | UserRole>("ALL");

  const filtered = auditLog.filter((entry) => {
    const matchSearch = search === "" || entry.user.toLowerCase().includes(search.toLowerCase()) || entry.action.toLowerCase().includes(search.toLowerCase()) || entry.detail.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "ALL" || entry.status === filterStatus;
    const matchRole = filterRole === "ALL" || entry.role === filterRole;
    return matchSearch && matchStatus && matchRole;
  });

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Actions", value: auditLog.length, color: "#6366f1" },
          { label: "Success", value: auditLog.filter((e) => e.status === "SUCCESS").length, color: "#10b981" },
          { label: "Failed", value: auditLog.filter((e) => e.status === "FAILED").length, color: "#ef4444" },
          { label: "Unique Users", value: new Set(auditLog.map((e) => e.user)).size, color: "#f59e0b" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-4 flex items-center gap-4" style={{ background: "white", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 40, height: 40, background: `${s.color}18` }}>
              <Filter size={18} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 rounded-xl px-3 flex-1" style={{ background: "white", border: "1px solid #e2e8f0", height: 40, minWidth: 200 }}>
          <Search size={14} color="#94a3b8" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by user, action, or detail..." style={{ background: "transparent", border: "none", outline: "none", fontSize: 13, color: "#475569", width: "100%" }} />
        </div>
        {(["ALL", "SUCCESS", "FAILED", "WARNING"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className="px-3 py-2 rounded-xl cursor-pointer"
            style={{
              background: filterStatus === s ? (s === "SUCCESS" ? "#dcfce7" : s === "FAILED" ? "#fee2e2" : s === "WARNING" ? "#fef3c7" : "#eff0fe") : "white",
              color: filterStatus === s ? (s === "SUCCESS" ? "#16a34a" : s === "FAILED" ? "#dc2626" : s === "WARNING" ? "#d97706" : "#6366f1") : "#64748b",
              border: "1px solid #e2e8f0",
              fontSize: 12, fontWeight: filterStatus === s ? 600 : 400,
            }}
          >
            {s}
          </button>
        ))}
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl ml-auto" style={{ background: "white", border: "1px solid #e2e8f0", color: "#475569", fontSize: 13, cursor: "pointer" }}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
              {["Timestamp", "User", "Role", "Action", "Detail", "IP", "Status"].map((h) => (
                <th key={h} className="px-5 py-3 text-left" style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => {
              const sc = statusConfig[entry.status];
              const ac = actionColors[entry.action] ?? { bg: "#f1f5f9", color: "#64748b" };
              const rc = roleConfig[entry.role];
              return (
                <tr key={entry.id} className="border-b" style={{ borderColor: "#f8fafc" }}>
                  <td className="px-5 py-3.5" style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>{entry.timestamp}</td>
                  <td className="px-5 py-3.5" style={{ fontSize: 12, color: "#0f172a", fontWeight: 500 }}>{entry.user}</td>
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 rounded-md text-nowrap" style={{ background: rc.bg, color: rc.color, fontSize: 10, fontWeight: 600 }}>{entry.role}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-1 rounded-lg" style={{ background: ac.bg, color: ac.color, fontSize: 10, fontWeight: 600, whiteSpace: "nowrap", fontFamily: "monospace" }}>{entry.action}</span>
                  </td>
                  <td className="px-5 py-3.5" style={{ fontSize: 12, color: "#475569", maxWidth: 280 }}>
                    <span className="line-clamp-1">{entry.detail}</span>
                  </td>
                  <td className="px-5 py-3.5" style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace", whiteSpace: "nowrap" }}>{entry.ip}</td>
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-1.5 w-fit px-2 py-1 rounded-lg" style={{ background: sc.bg, color: sc.color, fontSize: 10, fontWeight: 600 }}>
                      {sc.icon} {entry.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid #f1f5f9" }}>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>Showing {filtered.length} of {auditLog.length} entries</span>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded-lg" style={{ background: "#f8fafc", color: "#64748b", fontSize: 12, border: "1px solid #e2e8f0", cursor: "pointer" }}>← Prev</button>
            <button className="px-3 py-1.5 rounded-lg" style={{ background: "#f8fafc", color: "#64748b", fontSize: 12, border: "1px solid #e2e8f0", cursor: "pointer" }}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
