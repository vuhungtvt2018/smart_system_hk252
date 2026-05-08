// ─── Mock Data for RetainAI ───────────────────────────────────────────────────

export type RiskTier = "HIGH" | "MEDIUM" | "LOW";
export type UserRole = "Admin" | "Business User" | "ML Engineer";
export type ModelStatus = "Production" | "Staging" | "Archived" | "Pending";

// ── Customers ────────────────────────────────────────────────────────────────
export interface Customer {
  id: string;
  name: string;
  email: string;
  gender: string;
  senior: boolean;
  tenure: number;
  contract: string;
  internetService: string;
  monthlyCharges: number;
  totalCharges: number;
  churnProbability: number;
  riskTier: RiskTier;
  lastPrediction: string;
  prevRiskTier?: RiskTier;
  numServices: number;
  paymentMethod: string;
}

export const customers: Customer[] = [
  { id: "7590-VHVEG", name: "Alice Morgan", email: "alice.morgan@mail.com", gender: "Female", senior: false, tenure: 1, contract: "Month-to-month", internetService: "DSL", monthlyCharges: 29.85, totalCharges: 29.85, churnProbability: 0.91, riskTier: "HIGH", lastPrediction: "2026-03-30", prevRiskTier: "MEDIUM", numServices: 1, paymentMethod: "Electronic check" },
  { id: "5575-GNVDE", name: "Carlos Reyes", email: "c.reyes@mail.com", gender: "Male", senior: false, tenure: 34, contract: "One year", internetService: "DSL", monthlyCharges: 56.95, totalCharges: 1889.5, churnProbability: 0.83, riskTier: "HIGH", lastPrediction: "2026-03-30", prevRiskTier: "HIGH", numServices: 3, paymentMethod: "Mailed check" },
  { id: "3668-QPYBK", name: "Mei Lin", email: "mei.lin@mail.com", gender: "Female", senior: false, tenure: 2, contract: "Month-to-month", internetService: "DSL", monthlyCharges: 53.85, totalCharges: 108.15, churnProbability: 0.86, riskTier: "HIGH", lastPrediction: "2026-03-30", prevRiskTier: "HIGH", numServices: 2, paymentMethod: "Mailed check" },
  { id: "7795-CFOCW", name: "James Horton", email: "james.h@mail.com", gender: "Male", senior: false, tenure: 45, contract: "One year", internetService: "No", monthlyCharges: 42.3, totalCharges: 1840.75, churnProbability: 0.79, riskTier: "HIGH", lastPrediction: "2026-03-30", prevRiskTier: "MEDIUM", numServices: 4, paymentMethod: "Bank transfer" },
  { id: "9237-HQITU", name: "Priya Sharma", email: "priya.s@mail.com", gender: "Female", senior: false, tenure: 2, contract: "Month-to-month", internetService: "Fiber optic", monthlyCharges: 70.7, totalCharges: 151.65, churnProbability: 0.88, riskTier: "HIGH", lastPrediction: "2026-03-30", prevRiskTier: "HIGH", numServices: 2, paymentMethod: "Electronic check" },
  { id: "9305-CDSKC", name: "Devon Banks", email: "devon.b@mail.com", gender: "Male", senior: false, tenure: 8, contract: "Month-to-month", internetService: "Fiber optic", monthlyCharges: 99.65, totalCharges: 820.5, churnProbability: 0.74, riskTier: "HIGH", lastPrediction: "2026-03-30", prevRiskTier: "HIGH", numServices: 5, paymentMethod: "Electronic check" },
  { id: "1452-KIOVK", name: "Fatima Al-Hassan", email: "fatima.a@mail.com", gender: "Female", senior: false, tenure: 22, contract: "Month-to-month", internetService: "Fiber optic", monthlyCharges: 89.1, totalCharges: 1949.4, churnProbability: 0.71, riskTier: "HIGH", lastPrediction: "2026-03-30", prevRiskTier: "MEDIUM", numServices: 4, paymentMethod: "Credit card" },
  { id: "6713-OKOMC", name: "Samuel Okafor", email: "s.okafor@mail.com", gender: "Male", senior: false, tenure: 10, contract: "Month-to-month", internetService: "DSL", monthlyCharges: 29.75, totalCharges: 301.9, churnProbability: 0.52, riskTier: "MEDIUM", lastPrediction: "2026-03-30", prevRiskTier: "LOW", numServices: 2, paymentMethod: "Mailed check" },
  { id: "7892-POOKP", name: "Sandra Novak", email: "s.novak@mail.com", gender: "Female", senior: true, tenure: 28, contract: "Month-to-month", internetService: "Fiber optic", monthlyCharges: 104.8, totalCharges: 3046.05, churnProbability: 0.61, riskTier: "MEDIUM", lastPrediction: "2026-03-30", prevRiskTier: "MEDIUM", numServices: 6, paymentMethod: "Electronic check" },
  { id: "6388-TABGU", name: "Luis Moreno", email: "luis.m@mail.com", gender: "Male", senior: false, tenure: 49, contract: "Month-to-month", internetService: "Fiber optic", monthlyCharges: 103.7, totalCharges: 5036.3, churnProbability: 0.58, riskTier: "MEDIUM", lastPrediction: "2026-03-30", prevRiskTier: "HIGH", numServices: 5, paymentMethod: "Electronic check" },
  { id: "9763-GRSKD", name: "Emily Chen", email: "emily.c@mail.com", gender: "Female", senior: false, tenure: 25, contract: "One year", internetService: "Fiber optic", monthlyCharges: 89.0, totalCharges: 2225.0, churnProbability: 0.45, riskTier: "MEDIUM", lastPrediction: "2026-03-30", prevRiskTier: "MEDIUM", numServices: 3, paymentMethod: "Bank transfer" },
  { id: "7469-LKBCI", name: "Omar El-Amin", email: "omar.e@mail.com", gender: "Male", senior: false, tenure: 59, contract: "Month-to-month", internetService: "Fiber optic", monthlyCharges: 79.2, totalCharges: 4683.8, churnProbability: 0.47, riskTier: "MEDIUM", lastPrediction: "2026-03-30", prevRiskTier: "MEDIUM", numServices: 3, paymentMethod: "Bank transfer" },
  { id: "8091-TTVAX", name: "Diana Park", email: "diana.p@mail.com", gender: "Female", senior: false, tenure: 71, contract: "Two year", internetService: "DSL", monthlyCharges: 20.2, totalCharges: 1401.4, churnProbability: 0.08, riskTier: "LOW", lastPrediction: "2026-03-30", prevRiskTier: "LOW", numServices: 1, paymentMethod: "Credit card" },
  { id: "0280-XJGEX", name: "Nathan Rivers", email: "n.rivers@mail.com", gender: "Male", senior: false, tenure: 66, contract: "Two year", internetService: "DSL", monthlyCharges: 73.0, totalCharges: 4763.05, churnProbability: 0.12, riskTier: "LOW", lastPrediction: "2026-03-30", prevRiskTier: "LOW", numServices: 5, paymentMethod: "Credit card" },
  { id: "5129-JLPIS", name: "Aisha Thompson", email: "aisha.t@mail.com", gender: "Female", senior: false, tenure: 55, contract: "Two year", internetService: "DSL", monthlyCharges: 83.75, totalCharges: 4597.75, churnProbability: 0.19, riskTier: "LOW", lastPrediction: "2026-03-30", prevRiskTier: "LOW", numServices: 4, paymentMethod: "Bank transfer" },
  { id: "3213-VVOLG", name: "Viktor Petrov", email: "viktor.p@mail.com", gender: "Male", senior: false, tenure: 48, contract: "One year", internetService: "Fiber optic", monthlyCharges: 90.45, totalCharges: 4259.55, churnProbability: 0.25, riskTier: "LOW", lastPrediction: "2026-03-30", prevRiskTier: "MEDIUM", numServices: 5, paymentMethod: "Bank transfer" },
];

// ── Churn Trend Data ─────────────────────────────────────────────────────────
export const churnTrendData = [
  { month: "Oct '25", churnRate: 26.2, customers: 980, highRisk: 180, mediumRisk: 240, lowRisk: 560 },
  { month: "Nov '25", churnRate: 25.8, customers: 1020, highRisk: 175, mediumRisk: 255, lowRisk: 590 },
  { month: "Dec '25", churnRate: 27.1, customers: 1105, highRisk: 210, mediumRisk: 265, lowRisk: 630 },
  { month: "Jan '26", churnRate: 26.5, customers: 1080, highRisk: 198, mediumRisk: 258, lowRisk: 624 },
  { month: "Feb '26", churnRate: 25.0, customers: 1060, highRisk: 185, mediumRisk: 245, lowRisk: 630 },
  { month: "Mar '26", churnRate: 24.1, customers: 1043, highRisk: 172, mediumRisk: 238, lowRisk: 633 },
];

// ── Risk Distribution ─────────────────────────────────────────────────────────
export const riskDistributionData = [
  { name: "HIGH", value: 172, color: "#ef4444" },
  { name: "MEDIUM", value: 238, color: "#f59e0b" },
  { name: "LOW", value: 633, color: "#10b981" },
];

// ── Model Performance ─────────────────────────────────────────────────────────
export const modelPerformanceData = [
  { week: "W1", auc: 0.882, f1: 0.798, recall: 0.831, precision: 0.768 },
  { week: "W2", auc: 0.879, f1: 0.795, recall: 0.828, precision: 0.765 },
  { week: "W3", auc: 0.875, f1: 0.791, recall: 0.825, precision: 0.760 },
  { week: "W4", auc: 0.871, f1: 0.787, recall: 0.820, precision: 0.757 },
  { week: "W5", auc: 0.868, f1: 0.783, recall: 0.818, precision: 0.752 },
  { week: "W6", auc: 0.872, f1: 0.788, recall: 0.822, precision: 0.758 },
  { week: "W7", auc: 0.877, f1: 0.793, recall: 0.826, precision: 0.763 },
  { week: "W8", auc: 0.881, f1: 0.797, recall: 0.830, precision: 0.767 },
];

// ── PSI Data ─────────────────────────────────────────────────────────────────
export const psiData = [
  { feature: "tenure", psi: 0.08, status: "OK" },
  { feature: "monthlyCharges", psi: 0.12, status: "OK" },
  { feature: "totalCharges", psi: 0.09, status: "OK" },
  { feature: "numServices", psi: 0.17, status: "WARNING" },
  { feature: "contract", psi: 0.04, status: "OK" },
  { feature: "internetService", psi: 0.21, status: "CRITICAL" },
  { feature: "paymentMethod", psi: 0.06, status: "OK" },
  { feature: "charges_per_month", psi: 0.11, status: "OK" },
];

export const psiTrendData = [
  { date: "Mar 01", psi: 0.09 },
  { date: "Mar 05", psi: 0.11 },
  { date: "Mar 10", psi: 0.13 },
  { date: "Mar 15", psi: 0.15 },
  { date: "Mar 20", psi: 0.18 },
  { date: "Mar 25", psi: 0.20 },
  { date: "Mar 30", psi: 0.21 },
];

// ── Model Registry ────────────────────────────────────────────────────────────
export interface ModelVersion {
  id: string;
  version: string;
  algorithm: string;
  trainedAt: string;
  trainedBy: string;
  auc: number;
  f1: number;
  recall: number;
  precision: number;
  status: ModelStatus;
  datasetVersion: string;
  notes: string;
  promotedBy?: string;
  promotedAt?: string;
}

export const modelVersions: ModelVersion[] = [
  {
    id: "mv-007",
    version: "v2.3.1",
    algorithm: "XGBoost",
    trainedAt: "2026-03-28 14:22",
    trainedBy: "auto-airflow",
    auc: 0.881,
    f1: 0.797,
    recall: 0.830,
    precision: 0.767,
    status: "Production",
    datasetVersion: "ds-2026-03-28",
    notes: "Triggered by drift detection (internetService PSI > 0.20)",
    promotedBy: "admin",
    promotedAt: "2026-03-29 09:15",
  },
  {
    id: "mv-006",
    version: "v2.2.0",
    algorithm: "XGBoost",
    trainedAt: "2026-03-10 11:00",
    trainedBy: "ml-engineer-01",
    auc: 0.872,
    f1: 0.786,
    recall: 0.820,
    precision: 0.755,
    status: "Archived",
    datasetVersion: "ds-2026-03-10",
    notes: "Scheduled retrain – weekly pipeline",
    promotedBy: "admin",
    promotedAt: "2026-03-11 08:00",
  },
  {
    id: "mv-005",
    version: "v2.1.3",
    algorithm: "Random Forest",
    trainedAt: "2026-02-20 09:30",
    trainedBy: "ml-engineer-02",
    auc: 0.855,
    f1: 0.771,
    recall: 0.808,
    precision: 0.738,
    status: "Archived",
    datasetVersion: "ds-2026-02-20",
    notes: "RF variant experiment – underperformed XGBoost",
  },
  {
    id: "mv-004",
    version: "v2.0.0",
    algorithm: "XGBoost",
    trainedAt: "2026-02-01 15:45",
    trainedBy: "ml-engineer-01",
    auc: 0.863,
    f1: 0.779,
    recall: 0.815,
    precision: 0.746,
    status: "Archived",
    datasetVersion: "ds-2026-02-01",
    notes: "Major version – added charges_per_month feature",
  },
  {
    id: "mv-008",
    version: "v2.4.0-staging",
    algorithm: "XGBoost + LightGBM Ensemble",
    trainedAt: "2026-03-30 08:10",
    trainedBy: "ml-engineer-02",
    auc: 0.891,
    f1: 0.808,
    recall: 0.841,
    precision: 0.778,
    status: "Staging",
    datasetVersion: "ds-2026-03-30",
    notes: "Ensemble experiment – awaiting Admin approval",
  },
];

// ── Alerts ────────────────────────────────────────────────────────────────────
export interface Alert {
  id: string;
  type: "DRIFT" | "RISK_TIER" | "MODEL" | "SYSTEM";
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionRequired: boolean;
}

export const alerts: Alert[] = [
  {
    id: "al-001",
    type: "DRIFT",
    severity: "critical",
    title: "Data Drift Detected – internetService",
    message: "PSI for 'internetService' has exceeded critical threshold (PSI=0.21 > 0.20). Automatic retrain has been triggered.",
    timestamp: "2026-03-30 07:45",
    read: false,
    actionRequired: true,
  },
  {
    id: "al-002",
    type: "RISK_TIER",
    severity: "warning",
    title: "HIGH Risk Customers Spike Detected",
    message: "Number of HIGH risk customers increased by 24% compared to yesterday (148 → 172). Immediate retention action recommended.",
    timestamp: "2026-03-30 06:00",
    read: false,
    actionRequired: true,
  },
  {
    id: "al-003",
    type: "MODEL",
    severity: "info",
    title: "New Model v2.4.0-staging Ready for Review",
    message: "ML Engineer has submitted model v2.4.0-staging for promotion to production. AUC: 0.891, F1: 0.808.",
    timestamp: "2026-03-30 08:15",
    read: false,
    actionRequired: true,
  },
  {
    id: "al-004",
    type: "DRIFT",
    severity: "warning",
    title: "PSI Warning – numServices",
    message: "PSI for 'numServices' has reached warning threshold (PSI=0.17 > 0.15). Monitor closely.",
    timestamp: "2026-03-29 18:00",
    read: true,
    actionRequired: false,
  },
  {
    id: "al-005",
    type: "MODEL",
    severity: "info",
    title: "Model v2.3.1 Promoted to Production",
    message: "Admin approved model v2.3.1 (XGBoost). Previous model v2.2.0 archived.",
    timestamp: "2026-03-29 09:15",
    read: true,
    actionRequired: false,
  },
  {
    id: "al-006",
    type: "SYSTEM",
    severity: "info",
    title: "Daily Batch Prediction Completed",
    message: "Batch inference completed for 1,043 customers. 172 HIGH, 238 MEDIUM, 633 LOW risk.",
    timestamp: "2026-03-30 05:00",
    read: true,
    actionRequired: false,
  },
];

// ── Users ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "Active" | "Inactive" | "Locked";
  lastLogin: string;
  createdAt: string;
  avatar: string;
}

export const users: User[] = [
  { id: "u-001", name: "Admin User", email: "admin@retainai.io", role: "Admin", status: "Active", lastLogin: "2026-03-30 09:00", createdAt: "2025-01-10", avatar: "AU" },
  { id: "u-002", name: "Sarah Connor", email: "sarah.c@retainai.io", role: "Business User", status: "Active", lastLogin: "2026-03-30 08:45", createdAt: "2025-02-15", avatar: "SC" },
  { id: "u-003", name: "Dr. Chen Wei", email: "chen.w@retainai.io", role: "ML Engineer", status: "Active", lastLogin: "2026-03-30 08:10", createdAt: "2025-01-20", avatar: "CW" },
  { id: "u-004", name: "Mark Johnson", email: "mark.j@retainai.io", role: "Business User", status: "Active", lastLogin: "2026-03-29 17:30", createdAt: "2025-03-01", avatar: "MJ" },
  { id: "u-005", name: "Nguyen Van An", email: "vanan@retainai.io", role: "ML Engineer", status: "Active", lastLogin: "2026-03-30 07:55", createdAt: "2025-02-28", avatar: "NA" },
  { id: "u-006", name: "Lisa Park", email: "lisa.p@retainai.io", role: "Business User", status: "Inactive", lastLogin: "2026-03-15 11:20", createdAt: "2025-04-10", avatar: "LP" },
  { id: "u-007", name: "Tom Bradley", email: "tom.b@retainai.io", role: "Business User", status: "Locked", lastLogin: "2026-03-20 09:00", createdAt: "2025-05-22", avatar: "TB" },
];

// ── Audit Log ─────────────────────────────────────────────────────────────────
export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  role: UserRole;
  action: string;
  detail: string;
  ip: string;
  status: "SUCCESS" | "FAILED" | "WARNING";
}

export const auditLog: AuditEntry[] = [
  { id: "log-001", timestamp: "2026-03-30 09:15", user: "admin@retainai.io", role: "Admin", action: "MODEL_PROMOTE", detail: "Promoted model v2.3.1 to production", ip: "192.168.1.10", status: "SUCCESS" },
  { id: "log-002", timestamp: "2026-03-30 08:40", user: "chen.w@retainai.io", role: "ML Engineer", action: "MODEL_SUBMIT", detail: "Submitted v2.4.0-staging for review", ip: "192.168.1.25", status: "SUCCESS" },
  { id: "log-003", timestamp: "2026-03-30 08:00", user: "admin@retainai.io", role: "Admin", action: "CONFIG_UPDATE", detail: "Updated risk tier thresholds: HIGH≥0.70, MEDIUM 0.40-0.70", ip: "192.168.1.10", status: "SUCCESS" },
  { id: "log-004", timestamp: "2026-03-30 07:50", user: "vanan@retainai.io", role: "ML Engineer", action: "PREDICT_BATCH", detail: "Batch inference: 1043 customers processed", ip: "192.168.1.30", status: "SUCCESS" },
  { id: "log-005", timestamp: "2026-03-29 18:30", user: "admin@retainai.io", role: "Admin", action: "USER_CREATE", detail: "Created account for Nguyen Van An (ML Engineer)", ip: "192.168.1.10", status: "SUCCESS" },
  { id: "log-006", timestamp: "2026-03-29 17:10", user: "sarah.c@retainai.io", role: "Business User", action: "REPORT_EXPORT", detail: "Exported March churn report (PDF)", ip: "192.168.2.5", status: "SUCCESS" },
  { id: "log-007", timestamp: "2026-03-29 16:45", user: "tom.b@retainai.io", role: "Business User", action: "LOGIN_FAILED", detail: "3 consecutive failed login attempts – account locked", ip: "192.168.3.99", status: "FAILED" },
  { id: "log-008", timestamp: "2026-03-29 14:00", user: "chen.w@retainai.io", role: "ML Engineer", action: "TRAINING_RUN", detail: "Triggered manual training run – model v2.3.1", ip: "192.168.1.25", status: "SUCCESS" },
  { id: "log-009", timestamp: "2026-03-29 09:00", user: "admin@retainai.io", role: "Admin", action: "SCHEDULE_UPDATE", detail: "Updated batch pipeline schedule: daily 05:00 UTC", ip: "192.168.1.10", status: "SUCCESS" },
  { id: "log-010", timestamp: "2026-03-28 15:30", user: "vanan@retainai.io", role: "ML Engineer", action: "PREDICT_ONDEMAND", detail: "On-demand prediction for customer 7590-VHVEG", ip: "192.168.1.30", status: "SUCCESS" },
];

// ── Feature Importance ────────────────────────────────────────────────────────
export const featureImportance = [
  { feature: "tenure", importance: 0.182 },
  { feature: "monthlyCharges", importance: 0.165 },
  { feature: "totalCharges", importance: 0.143 },
  { feature: "contract", importance: 0.128 },
  { feature: "internetService", importance: 0.112 },
  { feature: "numServices", importance: 0.098 },
  { feature: "charges_per_month", importance: 0.087 },
  { feature: "paymentMethod", importance: 0.085 },
];

// ── KPI Stats ─────────────────────────────────────────────────────────────────
export const kpiStats = {
  totalCustomers: 1043,
  highRisk: 172,
  mediumRisk: 238,
  lowRisk: 633,
  churnRateMonth: 24.1,
  churnRatePrev: 25.0,
  retentionRate: 75.9,
  avgProbability: 0.347,
  modelAUC: 0.881,
  modelF1: 0.797,
  modelRecall: 0.830,
  alertsUnread: 3,
  lastBatchRun: "2026-03-30 05:00",
  modelVersion: "v2.3.1 (XGBoost)",
};

// ── Retention Effectiveness ───────────────────────────────────────────────────
export const retentionData = [
  { month: "Oct", contacted: 165, retained: 95, retentionRate: 57.6 },
  { month: "Nov", contacted: 172, retained: 104, retentionRate: 60.5 },
  { month: "Dec", contacted: 201, retained: 118, retentionRate: 58.7 },
  { month: "Jan", contacted: 188, retained: 115, retentionRate: 61.2 },
  { month: "Feb", contacted: 178, retained: 112, retentionRate: 62.9 },
  { month: "Mar", contacted: 165, retained: 108, retentionRate: 65.5 },
];

// ── Contract Distribution ─────────────────────────────────────────────────────
export const contractDistribution = [
  { name: "Month-to-month", value: 55, color: "#ef4444" },
  { name: "One year", value: 24, color: "#f59e0b" },
  { name: "Two year", value: 21, color: "#10b981" },
];
