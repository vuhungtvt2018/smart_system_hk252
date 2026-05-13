const BASE_URL = "http://localhost:8000/api/v1";

const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  "X-User-Role": "ML Engineer",
};

/**
 * Custom fetch wrapper to handle JSON and errors professionally.
 */
async function fetchClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Ensure endpoint starts with /
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${BASE_URL}${path}`;
  const headers = { ...DEFAULT_HEADERS, ...options.headers };

  // Remove Content-Type if body is FormData
  if (options.body instanceof FormData) {
    delete (headers as Record<string, string>)["Content-Type"];
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch {
      // Failed to parse JSON error
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses
  if (response.status === 204) {
    return {} as T;
  }

  // If response is meant to be downloaded (Blob)
  const contentType = response.headers.get("content-type");
  if (contentType && (contentType.includes("text/csv") || contentType.includes("application/octet-stream"))) {
    return response.blob() as unknown as T;
  }

  return response.json();
}

// ==========================================
// Prediction API Services
// ==========================================

export interface PredictionRequest {
  customer_id?: string;
  gender: string;
  senior_citizen: number;
  partner: string;
  dependents: string;
  phone_service: string;
  multiple_lines: string;
  internet_service: string;
  online_security: string;
  online_backup: string;
  device_protection: string;
  tech_support: string;
  streaming_tv: string;
  streaming_movies: string;
  tenure: number;
  contract: string;
  paperless_billing: string;
  payment_method: string;
  monthly_charges: number;
  total_charges: number;
}

export interface PredictionResponse {
  id: number;
  customer_id?: string;
  churn_probability: number;
  risk_tier: "HIGH" | "MEDIUM" | "LOW";
  created_at: string;
}

export interface BatchPredictionResultItem {
  row_index: number;
  customer_id?: string;
  churn_probability: number;
  risk_tier: "HIGH" | "MEDIUM" | "LOW";
  
  // Extra fields
  gender?: string;
  senior_citizen?: number;
  tenure?: number;
  contract?: string;
  internet_service?: string;
  monthly_charges?: number;
  total_charges?: number;
  payment_method?: string;
  partner?: string;
  dependents?: string;
  phone_service?: string;
  multiple_lines?: string;
  online_security?: string;
  online_backup?: string;
  device_protection?: string;
  tech_support?: string;
  streaming_tv?: string;
  streaming_movies?: string;
  paperless_billing?: string;
}

export interface BatchPredictionResponse {
  job_id: number;
  filename: string;
  processed_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  status: string;
  results: BatchPredictionResultItem[];
  created_at: string;
}

export interface BatchJobSummary {
  job_id: number;
  filename: string;
  processed_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  status: string;
  created_at: string;
}

export const PredictionService = {
  predictChurn: (data: PredictionRequest) => {
    return fetchClient<PredictionResponse>("/predictions/predict", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getPredictionHistory: (skip = 0, limit = 50) => {
    return fetchClient<PredictionResponse[]>(`/predictions/history?skip=${skip}&limit=${limit}`);
  },

  batchPredict: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetchClient<BatchPredictionResponse>("/predictions/batch", {
      method: "POST",
      body: formData,
    });
  },

  getBatchHistory: (skip = 0, limit = 20) => {
    return fetchClient<BatchJobSummary[]>(`/predictions/batch/history?skip=${skip}&limit=${limit}`);
  },

  getBatchJobResults: (jobId: number) => {
    return fetchClient<BatchPredictionResponse>(`/predictions/batch/${jobId}/results`);
  },

  getLatestBatchResults: () => {
    return fetchClient<BatchPredictionResponse>("/predictions/batch/latest/results");
  },

  downloadBatchResults: async (jobId: number, filename: string) => {
    const blob = await fetchClient<Blob>(`/predictions/batch/${jobId}/download`);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  downloadTemplate: async () => {
    const blob = await fetchClient<Blob>("/predictions/template/download");
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "batch_prediction_template.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};

// ==========================================
// Dashboard API Services
// ==========================================

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

export interface DashboardMetrics {
  totalCustomers: number;
  highRisk: number;
  riskDistribution: { name: string; value: number; color: string }[];
  lastBatchRun: string;
  topHighRiskCustomers: { id: string; name: string; contract: string; churnProbability: number; riskTier: string }[];
  modelAUC: number;
  modelF1: number;
  modelRecall: number;
  modelPrecision: number;
  topFeatureImportance: { feature: string; importance: number }[];
  recentAlerts: Alert[];
  // New fields
  churnRate: number;
  prevChurnRate: number;
  retentionRate: number;
  churnTrend: { month: string; highRisk: number; mediumRisk: number; lowRisk: number; churnRate: number; customers: number }[];
  modelPerformanceTrend: { week: string; auc: number; f1: number; recall: number; precision: number }[];
  contractDistribution: { name: string; value: number; color: string }[];
  retentionData: { month: string; contacted: number; retained: number; retentionRate: number }[];
}

export const DashboardService = {
  getMetrics: () => {
    return fetchClient<DashboardMetrics>("/dashboard/metrics");
  },
  getAlerts: () => {
    return fetchClient<Alert[]>("/dashboard/alerts");
  },
};

// ==========================================
// Admin API Services
// ==========================================

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Inactive" | "Locked";
  lastLogin: string;
  createdAt: string;
  avatar: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  detail: string;
  ip: string;
  status: "SUCCESS" | "FAILED" | "WARNING";
}

export const AdminService = {
  getUsers: () => {
    return fetchClient<User[]>("/admin/users");
  },
  getAuditLogs: () => {
    return fetchClient<AuditEntry[]>("/admin/audit-logs");
  },
};

// ==========================================
// Monitoring API Services
// ==========================================

export interface PsiFeature {
  feature: string;
  psi: number;
  status: "OK" | "WARNING" | "CRITICAL";
}

export interface PsiTrend {
  date: string;
  psi: number;
}

export interface ModelPerformanceTrend {
  week: string;
  auc: number;
  f1: number;
  recall: number;
  precision: number;
}

export interface MonitoringMetrics {
  psiData: PsiFeature[];
  psiTrendData: PsiTrend[];
  modelPerformanceData: ModelPerformanceTrend[];
}

export const MonitoringService = {
  getMetrics: () => {
    return fetchClient<MonitoringMetrics>("/monitoring/metrics");
  },
};
