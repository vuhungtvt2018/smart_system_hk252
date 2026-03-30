import React from "react";
import { NavLink, useLocation } from "react-router";
import {
  LayoutDashboard, Users, Brain, Activity, FileBarChart2,
  Bell, Settings, ClipboardList, ChevronLeft, ChevronRight,
  Zap, Shield, Database, GitBranch, BarChart3, AlertTriangle
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { UserRole } from "../../data/mockData";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: UserRole[];
  badge?: number;
  section?: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/", icon: <LayoutDashboard size={18} />, roles: ["Admin", "Business User", "ML Engineer"], section: "main" },
  { label: "Customer Risk", path: "/customers", icon: <Users size={18} />, roles: ["Admin", "Business User", "ML Engineer"], section: "main" },
  { label: "Reports", path: "/reports", icon: <BarChart3 size={18} />, roles: ["Admin", "Business User", "ML Engineer"], section: "main" },
  { label: "Alerts", path: "/alerts", icon: <Bell size={18} />, roles: ["Admin", "Business User", "ML Engineer"], badge: 3, section: "main" },
  { label: "Prediction", path: "/prediction", icon: <Zap size={18} />, roles: ["Admin", "ML Engineer"], section: "ml" },
  { label: "Model Registry", path: "/models", icon: <GitBranch size={18} />, roles: ["Admin", "ML Engineer"], section: "ml" },
  { label: "Monitoring", path: "/monitoring", icon: <Activity size={18} />, roles: ["Admin", "ML Engineer"], section: "ml" },
  { label: "User Management", path: "/admin/users", icon: <Shield size={18} />, roles: ["Admin"], section: "admin" },
  { label: "System Config", path: "/admin/config", icon: <Settings size={18} />, roles: ["Admin"], section: "admin" },
  { label: "Audit Log", path: "/admin/audit", icon: <ClipboardList size={18} />, roles: ["Admin"], section: "admin" },
];

const sectionLabels: Record<string, string> = {
  main: "Overview",
  ml: "ML Operations",
  admin: "Administration",
};

export function Sidebar() {
  const { currentRole, sidebarCollapsed, setSidebarCollapsed } = useApp();
  const location = useLocation();

  const filteredItems = navItems.filter((item) => item.roles.includes(currentRole));

  const sections = ["main", "ml", "admin"].filter((s) =>
    filteredItems.some((i) => i.section === s)
  );

  return (
    <aside
      className="flex flex-col h-full transition-all duration-300 relative"
      style={{
        width: sidebarCollapsed ? "64px" : "240px",
        background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
        borderRight: "1px solid rgba(99,102,241,0.12)",
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-5 border-b"
        style={{ borderColor: "rgba(99,102,241,0.15)" }}
      >
        <div
          className="flex items-center justify-center rounded-xl flex-shrink-0"
          style={{ width: 36, height: 36, background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        >
          <Brain size={18} color="white" />
        </div>
        {!sidebarCollapsed && (
          <div>
            <div style={{ color: "white", fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>RetainAI</div>
            <div style={{ color: "#94a3b8", fontSize: 11 }}>Churn Intelligence</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {sections.map((section) => {
          const items = filteredItems.filter((i) => i.section === section);
          if (items.length === 0) return null;
          return (
            <div key={section} className="mb-4">
              {!sidebarCollapsed && (
                <div
                  className="px-3 mb-1.5"
                  style={{ color: "#475569", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}
                >
                  {sectionLabels[section]}
                </div>
              )}
              {items.map((item) => {
                const isActive = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={sidebarCollapsed ? item.label : undefined}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 relative group"
                    style={{
                      color: isActive ? "white" : "#94a3b8",
                      background: isActive
                        ? "linear-gradient(90deg, rgba(99,102,241,0.85) 0%, rgba(139,92,246,0.7) 100%)"
                        : "transparent",
                      transition: "all 0.15s",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.15)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {!sidebarCollapsed && (
                      <>
                        <span style={{ fontSize: 14, fontWeight: isActive ? 600 : 400, flex: 1 }}>{item.label}</span>
                        {item.badge && (
                          <span
                            className="flex items-center justify-center rounded-full"
                            style={{ background: "#ef4444", color: "white", fontSize: 10, fontWeight: 700, minWidth: 18, height: 18, padding: "0 4px" }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                    {sidebarCollapsed && item.badge && (
                      <span
                        className="absolute top-1 right-1 rounded-full"
                        style={{ background: "#ef4444", width: 8, height: 8 }}
                      />
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Model Status */}
      {!sidebarCollapsed && (
        <div className="mx-3 mb-3 p-3 rounded-xl" style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)" }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full" style={{ background: "#10b981" }} />
            <span style={{ color: "#94a3b8", fontSize: 11 }}>Model Active</span>
          </div>
          <div style={{ color: "white", fontSize: 12, fontWeight: 600 }}>v2.3.1 XGBoost</div>
          <div style={{ color: "#64748b", fontSize: 11 }}>AUC: 0.881 · F1: 0.797</div>
        </div>
      )}

      {/* Collapse Toggle */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="absolute -right-3 top-20 flex items-center justify-center rounded-full cursor-pointer"
        style={{
          width: 24, height: 24,
          background: "#1e293b",
          border: "1px solid rgba(99,102,241,0.3)",
          color: "#94a3b8",
          zIndex: 10,
        }}
      >
        {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
