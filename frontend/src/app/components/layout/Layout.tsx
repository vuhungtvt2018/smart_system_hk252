import React from "react";
import { Outlet, useLocation } from "react-router";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

const pageMeta: Record<string, { title: string; subtitle?: string }> = {
  "/": { title: "Dashboard", subtitle: "RetainAI · Customer Churn Intelligence Overview" },
  "/customers": { title: "Customer Risk List", subtitle: "All customers with churn probability & risk tier" },
  "/reports": { title: "Reports & Analytics", subtitle: "Churn trends, retention effectiveness, and insights" },
  "/alerts": { title: "Alerts & Notifications", subtitle: "System alerts, drift warnings, and model events" },
  "/prediction": { title: "Churn Prediction", subtitle: "On-demand prediction & batch inference" },
  "/models": { title: "Model Registry", subtitle: "Manage, promote, and rollback model versions" },
  "/monitoring": { title: "Drift & Performance Monitoring", subtitle: "PSI, data drift, and model health metrics" },
  "/admin/users": { title: "User Management", subtitle: "Manage accounts and role permissions" },
  "/admin/config": { title: "System Configuration", subtitle: "Risk thresholds, evaluation gates, and pipeline schedule" },
  "/admin/audit": { title: "Audit Log", subtitle: "Full history of system actions and changes" },
};

export function Layout() {
  const location = useLocation();
  const meta = pageMeta[location.pathname] ?? { title: "RetainAI" };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#f1f5f9" }}>
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header title={meta.title} subtitle={meta.subtitle} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
