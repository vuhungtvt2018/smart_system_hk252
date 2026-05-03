const BASE_URL = "http://localhost:8000/api/v1/predictions";

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
    return fetchClient<PredictionResponse>("/predict", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getPredictionHistory: (skip = 0, limit = 50) => {
    return fetchClient<PredictionResponse[]>(`/history?skip=${skip}&limit=${limit}`);
  },

  batchPredict: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetchClient<BatchPredictionResponse>("/batch", {
      method: "POST",
      body: formData,
    });
  },

  getBatchHistory: (skip = 0, limit = 20) => {
    return fetchClient<BatchJobSummary[]>(`/batch/history?skip=${skip}&limit=${limit}`);
  },

  getBatchJobResults: (jobId: number) => {
    return fetchClient<BatchPredictionResponse>(`/batch/${jobId}/results`);
  },

  downloadBatchResults: async (jobId: number, filename: string) => {
    const blob = await fetchClient<Blob>(`/batch/${jobId}/download`);
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
    const blob = await fetchClient<Blob>("/template/download");
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
