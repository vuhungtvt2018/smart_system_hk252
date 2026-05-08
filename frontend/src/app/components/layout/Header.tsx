import React, { useState } from "react";
import { Bell, ChevronDown, Search, Sun, Moon, Settings } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { UserRole, alerts } from "../../data/mockData";

const roles: UserRole[] = ["Admin", "Business User", "ML Engineer"];

const roleColors: Record<UserRole, string> = {
  Admin: "#6366f1",
  "Business User": "#10b981",
  "ML Engineer": "#f59e0b",
};

const roleAbbr: Record<UserRole, string> = {
  Admin: "AD",
  "Business User": "BU",
  "ML Engineer": "ML",
};

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const { currentRole, setCurrentRole } = useApp();
  const [roleOpen, setRoleOpen] = useState(false);
  const [dark, setDark] = useState(false);

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <header
      className="flex items-center gap-4 px-6 border-b"
      style={{ height: 64, background: "white", borderColor: "rgba(0,0,0,0.07)", flexShrink: 0 }}
    >
      {/* Title */}
      <div className="flex-1">
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1 }}>{subtitle}</p>}
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-2 rounded-xl px-3"
        style={{ background: "#f8fafc", border: "1px solid #e2e8f0", height: 38, minWidth: 220 }}
      >
        <Search size={14} color="#94a3b8" />
        <input
          type="text"
          placeholder="Search customers, models..."
          style={{ background: "transparent", border: "none", outline: "none", fontSize: 13, color: "#475569", width: "100%" }}
        />
      </div>

      {/* Notifications */}
      <button
        className="relative flex items-center justify-center rounded-xl"
        style={{ width: 38, height: 38, background: "#f8fafc", border: "1px solid #e2e8f0" }}
      >
        <Bell size={16} color="#475569" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center rounded-full"
            style={{ background: "#ef4444", color: "white", fontSize: 10, fontWeight: 700, width: 18, height: 18 }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* Role Switcher */}
      <div className="relative">
        <button
          onClick={() => setRoleOpen(!roleOpen)}
          className="flex items-center gap-2 rounded-xl px-3"
          style={{ height: 38, background: "#f8fafc", border: "1px solid #e2e8f0", cursor: "pointer" }}
        >
          <div
            className="flex items-center justify-center rounded-lg"
            style={{ width: 26, height: 26, background: roleColors[currentRole], flexShrink: 0 }}
          >
            <span style={{ color: "white", fontSize: 10, fontWeight: 700 }}>{roleAbbr[currentRole]}</span>
          </div>
          <div className="text-left hidden sm:block">
            <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", lineHeight: 1.2 }}>Demo Role</div>
            <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1 }}>{currentRole}</div>
          </div>
          <ChevronDown size={14} color="#94a3b8" />
        </button>

        {roleOpen && (
          <div
            className="absolute right-0 top-full mt-2 rounded-xl overflow-hidden z-50"
            style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 10px 40px rgba(0,0,0,0.12)", minWidth: 200 }}
          >
            <div className="px-3 py-2 border-b" style={{ borderColor: "#e2e8f0" }}>
              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Switch Demo Role</div>
            </div>
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => { setCurrentRole(role); setRoleOpen(false); }}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-left"
                style={{
                  background: currentRole === role ? "#f8fafc" : "transparent",
                  cursor: "pointer",
                  border: "none",
                }}
              >
                <div
                  className="flex items-center justify-center rounded-lg flex-shrink-0"
                  style={{ width: 28, height: 28, background: roleColors[role] }}
                >
                  <span style={{ color: "white", fontSize: 10, fontWeight: 700 }}>{roleAbbr[role]}</span>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{role}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    {role === "Admin" ? "Full access" : role === "Business User" ? "View & reports" : "ML & monitoring"}
                  </div>
                </div>
                {currentRole === role && (
                  <span className="ml-auto" style={{ color: "#6366f1", fontSize: 11, fontWeight: 600 }}>Active</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
