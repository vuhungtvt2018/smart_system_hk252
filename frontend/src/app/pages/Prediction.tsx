import React, { useState, useEffect } from "react";
import { Zap, Upload, CheckCircle, Clock, Download, Info, AlertCircle } from "lucide-react";
import {
  PredictionService,
  PredictionRequest,
  PredictionResponse,
  BatchJobSummary,
} from "../services/api";

const riskColor: Record<string, string> = { 
  HIGH: "#ef4444", 
  MEDIUM: "#f59e0b", 
  LOW: "#10b981" 
};

const riskBg: Record<string, string> = { 
  HIGH: "#fee2e2", 
  MEDIUM: "#fffbeb", 
  LOW: "#dcfce7" 
};

const inputFields = [
  { key: "customer_id", label: "Customer ID", type: "text", placeholder: "e.g. CUST-001" },
  { key: "gender", label: "Gender", type: "select", options: ["Male", "Female"] },
  { key: "senior_citizen", label: "Senior Citizen", type: "select", options: ["0", "1"], hint: "0 = No, 1 = Yes" },
  { key: "partner", label: "Partner", type: "select", options: ["Yes", "No"] },
  { key: "dependents", label: "Dependents", type: "select", options: ["Yes", "No"] },
  { key: "phone_service", label: "Phone Service", type: "select", options: ["Yes", "No"] },
  { key: "multiple_lines", label: "Multiple Lines", type: "select", options: ["Yes", "No", "No phone service"] },
  { key: "internet_service", label: "Internet Service", type: "select", options: ["DSL", "Fiber optic", "No"] },
  { key: "online_security", label: "Online Security", type: "select", options: ["Yes", "No", "No internet service"] },
  { key: "online_backup", label: "Online Backup", type: "select", options: ["Yes", "No", "No internet service"] },
  { key: "device_protection", label: "Device Protection", type: "select", options: ["Yes", "No", "No internet service"] },
  { key: "tech_support", label: "Tech Support", type: "select", options: ["Yes", "No", "No internet service"] },
  { key: "streaming_tv", label: "Streaming TV", type: "select", options: ["Yes", "No", "No internet service"] },
  { key: "streaming_movies", label: "Streaming Movies", type: "select", options: ["Yes", "No", "No internet service"] },
  { key: "tenure", label: "Tenure (months)", type: "number", placeholder: "e.g. 12" },
  { key: "contract", label: "Contract Type", type: "select", options: ["Month-to-month", "One year", "Two year"] },
  { key: "paperless_billing", label: "Paperless Billing", type: "select", options: ["Yes", "No"] },
  { key: "payment_method", label: "Payment Method", type: "select", options: ["Electronic check", "Mailed check", "Bank transfer (automatic)", "Credit card (automatic)"] },
  { key: "monthly_charges", label: "Monthly Charges ($)", type: "number", placeholder: "e.g. 79.99" },
  { key: "total_charges", label: "Total Charges ($)", type: "number", placeholder: "e.g. 960.00" },
];

export function Prediction() {
  const [tab, setTab] = useState<"ondemand" | "batch">("ondemand");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [batchStatus, setBatchStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [batchHistory, setBatchHistory] = useState<BatchJobSummary[]>([]);
  const [batchError, setBatchError] = useState("");

  useEffect(() => {
    if (tab === "batch") {
      fetchBatchHistory();
    }
  }, [tab]);

  const fetchBatchHistory = async () => {
    try {
      const history = await PredictionService.getBatchHistory();
      setBatchHistory(Array.isArray(history) ? history : []);
    } catch (e: any) {
      console.error("Fetch batch history failed:", e);
    }
  };

  const handlePredict = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      
      const safeParseInt = (val: string, fallback: number) => {
        const parsed = parseInt(val);
        return isNaN(parsed) ? fallback : parsed;
      };

      const safeParseFloat = (val: string, fallback: number) => {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? fallback : parsed;
      };

      const requestData: PredictionRequest = {
        customer_id: formValues.customer_id || undefined,
        gender: formValues.gender || "Male",
        senior_citizen: safeParseInt(formValues.senior_citizen, 0),
        partner: formValues.partner || "No",
        dependents: formValues.dependents || "No",
        phone_service: formValues.phone_service || "Yes",
        multiple_lines: formValues.multiple_lines || "No",
        internet_service: formValues.internet_service || "DSL",
        online_security: formValues.online_security || "No",
        online_backup: formValues.online_backup || "No",
        device_protection: formValues.device_protection || "No",
        tech_support: formValues.tech_support || "No",
        streaming_tv: formValues.streaming_tv || "No",
        streaming_movies: formValues.streaming_movies || "No",
        tenure: safeParseInt(formValues.tenure, 12),
        contract: formValues.contract || "Month-to-month",
        paperless_billing: formValues.paperless_billing || "Yes",
        payment_method: formValues.payment_method || "Electronic check",
        monthly_charges: safeParseFloat(formValues.monthly_charges, 50.0),
        total_charges: safeParseFloat(formValues.total_charges, 600.0),
      };

      const response = await PredictionService.predictChurn(requestData);
      setResult(response);
    } catch (e: any) {
      setErrorMsg(e.message || "Prediction request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setBatchFile(file);
      setBatchStatus("processing");
      setBatchError("");
      await PredictionService.batchPredict(file);
      setBatchStatus("done");
      fetchBatchHistory();
    } catch (err: any) {
      setBatchStatus("error");
      setBatchError(err.message || "Failed to process batch file");
    }
  };

  const downloadTemplate = async () => {
    try {
      await PredictionService.downloadTemplate();
    } catch (e) {
      console.error("Failed to download template", e);
    }
  };

  const downloadJobResult = async (jobId: number, filename: string) => {
    try {
      await PredictionService.downloadBatchResults(jobId, filename);
    } catch (e) {
      console.error("Failed to download job results", e);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 p-1 rounded-2xl" style={{ background: "white", border: "1px solid #f1f5f9", width: "fit-content" }}>
        {[
          { key: "ondemand", label: "On-Demand Prediction", icon: <Zap size={14} /> },
          { key: "batch", label: "Batch Inference", icon: <Upload size={14} /> },
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl cursor-pointer"
            style={{
              background: tab === key ? "linear-gradient(90deg, #6366f1, #8b5cf6)" : "transparent",
              color: tab === key ? "white" : "#64748b",
              fontSize: 13, fontWeight: tab === key ? 600 : 400, border: "none",
            }}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {tab === "ondemand" && (
        <div className="grid grid-cols-12 gap-4">
          {/* Form */}
          <div className="col-span-12 lg:col-span-7 rounded-2xl p-5" style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Customer Features</h3>
            <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 20 }}>Enter customer information to predict churn probability</p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {inputFields.map(({ key, label, type, placeholder, options, hint }) => (
                <div key={key}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>{label}</label>
                  {type === "select" ? (
                    <select
                      value={formValues[key] ?? ""}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl"
                      style={{ background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: 13, color: "#475569", outline: "none" }}
                    >
                      <option value="">Select...</option>
                      {options?.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type={type}
                      placeholder={placeholder}
                      value={formValues[key] ?? ""}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl"
                      style={{ background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: 13, color: "#475569", outline: "none" }}
                    />
                  )}
                  {hint && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3 }}>{hint}</div>}
                </div>
              ))}
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 rounded-xl flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 text-sm">
                <AlertCircle size={16} />
                {errorMsg}
              </div>
            )}

            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={handlePredict}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 rounded-xl"
                style={{
                  background: loading ? "#e2e8f0" : "linear-gradient(90deg, #6366f1, #8b5cf6)",
                  color: loading ? "#94a3b8" : "white",
                  fontSize: 13, fontWeight: 600, border: "none", cursor: loading ? "default" : "pointer",
                }}
              >
                {loading ? <><Clock size={14} className="animate-spin" /> Predicting...</> : <><Zap size={14} /> Predict Churn</>}
              </button>
              <button
                onClick={() => { setFormValues({}); setResult(null); setErrorMsg(""); }}
                className="px-4 py-3 rounded-xl"
                style={{ background: "#f8fafc", color: "#64748b", fontSize: 13, fontWeight: 500, border: "1px solid #e2e8f0", cursor: "pointer" }}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Result Panel */}
          <div className="col-span-12 lg:col-span-5">
            {!result && !loading && (
              <div className="rounded-2xl p-8 flex flex-col items-center justify-center h-full min-h-80" style={{ background: "white", border: "2px dashed #e2e8f0" }}>
                <div className="flex items-center justify-center rounded-2xl mb-4" style={{ width: 64, height: 64, background: "#f8fafc" }}>
                  <Zap size={28} color="#94a3b8" />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#475569" }}>No prediction yet</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Fill in customer features and click Predict</div>
              </div>
            )}

            {result && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "white", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: "1px solid #f1f5f9" }}>
                {/* Result Header */}
                <div className="p-5" style={{ background: `linear-gradient(135deg, ${riskBg[result.risk_tier.toUpperCase()] || "#fff"}, white)` }}>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>Prediction Result</div>
                  <div className="flex items-end gap-4">
                    <div>
                      <div style={{ fontSize: 52, fontWeight: 900, color: riskColor[result.risk_tier.toUpperCase()] || "#000", lineHeight: 1 }}>
                        {(result.churn_probability * 100).toFixed(0)}%
                      </div>
                      <div style={{ fontSize: 13, color: "#64748b" }}>Churn Probability</div>
                    </div>
                    <div className="mb-2">
                      <div className="px-4 py-2 rounded-xl" style={{ background: riskBg[result.risk_tier.toUpperCase()] || "#f1f5f9", border: `2px solid ${riskColor[result.risk_tier.toUpperCase()] || "#cbd5e1"}` }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: riskColor[result.risk_tier.toUpperCase()] || "#64748b" }}>{result.risk_tier} RISK</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 rounded-full overflow-hidden" style={{ height: 10, background: "#e2e8f0" }}>
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: `${result.churn_probability * 100}%`, 
                        background: `linear-gradient(90deg, ${riskColor[result.risk_tier.toUpperCase()] || "#6366f1"}, ${riskColor[result.risk_tier.toUpperCase()] || "#6366f1"}aa)`, 
                        transition: "width 0.8s ease" 
                      }} 
                    />
                  </div>
                </div>

                <div className="p-5">
                  <div className="p-3 rounded-xl" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#1d4ed8", marginBottom: 4 }}>System Action</div>
                    <div style={{ fontSize: 11, color: "#1e3a8a" }}>
                      Prediction successfully saved to database (ID: {result.id}). 
                      {(result.risk_tier || "").toUpperCase() === "HIGH" ? " Triggering retention workflows." : ""}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "batch" && (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-6 rounded-2xl p-5" style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Batch CSV Inference</h3>
            <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 20 }}>Upload a CSV file containing customer records. System will process each row and return churn predictions.</p>

            {/* Upload Zone */}
            <label
              className="flex flex-col items-center justify-center rounded-2xl cursor-pointer"
              style={{ height: 160, border: "2px dashed #c7d2fe", background: "#f8faff" }}
            >
              <Upload size={28} color="#6366f1" />
              <div style={{ fontSize: 13, fontWeight: 600, color: "#6366f1", marginTop: 12 }}>Click to upload CSV</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>or drag and drop · Max 50MB</div>
              <input type="file" accept=".csv" className="hidden" onChange={handleBatchUpload} />
            </label>

            {batchFile && (
              <div className="mt-4 flex flex-col gap-2 p-3 rounded-xl" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div className="flex items-center gap-3">
                  {batchStatus === "done" ? <CheckCircle size={16} color="#10b981" /> : batchStatus === "error" ? <AlertCircle size={16} color="#ef4444" /> : <Clock size={16} color="#6366f1" className="animate-spin" />}
                  <div className="flex-1">
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{batchFile.name}</div>
                    <div style={{ fontSize: 11, color: batchStatus === "error" ? "#ef4444" : "#94a3b8" }}>
                      {batchStatus === "processing" ? "Processing..." : batchStatus === "error" ? batchError : "Complete"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4">
              <h4 style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>Required CSV Columns</h4>
              <p style={{ fontSize: 11, color: "#ef4444", marginBottom: 8 }}>Note: You MUST include an identifier column (e.g. <b>customerID</b> or <b>name</b>)</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "customerID", "gender", "SeniorCitizen", "Partner", "Dependents",
                  "PhoneService", "MultipleLines", "InternetService",
                  "OnlineSecurity", "OnlineBackup", "DeviceProtection",
                  "TechSupport", "StreamingTV", "StreamingMovies",
                  "tenure", "Contract", "PaperlessBilling", "PaymentMethod",
                  "MonthlyCharges", "TotalCharges"
                ].map((col) => (
                  <span key={col} className="px-2 py-1 rounded-lg" style={{ background: "#f1f5f9", color: "#475569", fontSize: 11, fontFamily: "monospace" }}>{col}</span>
                ))}
              </div>
            </div>

            <button onClick={downloadTemplate} className="mt-4 flex items-center gap-2 text-sm" style={{ color: "#6366f1", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>
              <Download size={13} /> Download CSV Template
            </button>
          </div>

          {/* Batch History */}
          <div className="col-span-12 lg:col-span-6 rounded-2xl overflow-hidden" style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
            <div className="px-5 py-4 border-b flex justify-between items-center" style={{ borderColor: "#f1f5f9" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Batch Job History</h3>
              <button onClick={fetchBatchHistory} className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100">Refresh</button>
            </div>
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {!Array.isArray(batchHistory) || batchHistory.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">No batch history found.</div>
              ) : (
                batchHistory.map((job) => (
                  <div key={job.job_id} className="flex items-center gap-3 px-5 py-3.5">
                    {job.status === "done" ? <CheckCircle size={16} color="#10b981" className="flex-shrink-0" /> : job.status === "error" ? <AlertCircle size={16} color="#ef4444" className="flex-shrink-0" /> : <Clock size={16} color="#6366f1" className="flex-shrink-0 animate-spin" />}
                    <div className="flex-1">
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{job.filename}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{new Date(job.created_at).toLocaleString()} · {job.processed_count.toLocaleString()} rows</div>
                      {job.status === "done" && (
                        <div className="flex gap-2 mt-1">
                          <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 600 }}>HIGH: {job.high_count}</span>
                          <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 600 }}>MED: {job.medium_count}</span>
                          <span style={{ fontSize: 10, color: "#10b981", fontWeight: 600 }}>LOW: {job.low_count}</span>
                        </div>
                      )}
                    </div>
                    {job.status === "done" && (
                      <button
                        onClick={() => downloadJobResult(job.job_id, `results_${job.filename}`)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg"
                        style={{ background: "#f8fafc", color: "#64748b", fontSize: 11, border: "1px solid #e2e8f0", cursor: "pointer" }}
                      >
                        <Download size={11} /> CSV
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
