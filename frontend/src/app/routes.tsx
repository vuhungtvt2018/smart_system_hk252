import { createBrowserRouter } from "react-router";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./pages/Dashboard";
import { CustomerList } from "./pages/CustomerList";
import { Reports } from "./pages/Reports";
import { Alerts } from "./pages/Alerts";
import { Prediction } from "./pages/Prediction";
import { ModelRegistry } from "./pages/ModelRegistry";
import { Monitoring } from "./pages/Monitoring";
import { UserManagement } from "./pages/admin/UserManagement";
import { SystemConfig } from "./pages/admin/SystemConfig";
import { AuditLog } from "./pages/admin/AuditLog";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "customers", Component: CustomerList },
      { path: "reports", Component: Reports },
      { path: "alerts", Component: Alerts },
      { path: "prediction", Component: Prediction },
      { path: "models", Component: ModelRegistry },
      { path: "monitoring", Component: Monitoring },
      { path: "admin/users", Component: UserManagement },
      { path: "admin/config", Component: SystemConfig },
      { path: "admin/audit", Component: AuditLog },
    ],
  },
]);
