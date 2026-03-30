import React, { useState } from "react";
import { Zap, Upload, CheckCircle, Clock, AlertCircle, Download, Info } from "lucide-react";

const riskColor = { HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#10b981" };
const riskBg = { HIGH: "#fee2e2", MEDIUM: "#fffbeb", LOW: "#dcfce7" };

interface PredictionResult {
  customerID: string;
  churnProbability: number;
  riskTier: "HIGH" | "MEDIUM" | "LOW";
  topFactors: { feature: string; impact: number; direction: "+" | "-" }[];
}

const mockResult: PredictionResult = {
  customerID: "CUST-DEMO",
  churnProbability: 0.847,
  riskTier: "HIGH",
  topFactors: [
    { feature: "tenure (1 month)", impact: 0.31, direction: "+" },
    { feature: "Month-to-month contract", impact: 0.27, direction: "+" },
    { feature: "Electronic check payment", impact: 0.19, direction: "+" },
    { feature: "Fiber optic internet", impact: 0.14, direction: "+" },
    { feature: "No online security", impact: 0.09, direction: "+" },
  ],
};

const inputFields = [
  { key: "tenure", label: "Tenure (months)", type: "number", placeholder: "e.g. 12", hint: "Months as customer" },
  { key: "monthlyCharges", label: "Monthly Charges ($)", type: "number", placeholder: "e.g. 79.99" },
  { key: "totalCharges", label: "Total Charges ($)", type: "number", placeholder: "e.g. 960.00" },
  { key: "contract", label: "Contract Type", type: "select", options: ["Month-to-month", "One year", "Two year"] },
  { key: "internetService", label: "Internet Service", type: "select", options: ["DSL", "Fiber optic", "No"] },
  { key: "paymentMethod", label: "Payment Method", type: "select", options: ["Electronic check", "Mailed check", "Bank transfer", "Credit card"] },
  { key: "numServices", label: "Number of Services", type: "number", placeholder: "0-7" },
  { key: "seniorCitizen", label: "Senior Citizen", type: "select", options: ["No", "Yes"] },
];

export function Prediction() {
  const [tab, setTab] = useState<"ondemand" | "batch">("ondemand");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [batchFile, setBatchFile] = useState<string | null>(null);
  const [batchStatus, setBatchStatus] = useState<"idle" | "processing" | "done" | "error">("idle");

  const handlePredict = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setResult(mockResult);
    }, 1500);
  };

  const handleBatchUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBatchFile(file.name);
      setBatchStatus("processing");
      setTimeout(() => setBatchStatus("done"), 2000);
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
          <div className="col-span-12 lg:col-span-6 rounded-2xl p-5" style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Customer Features</h3>
            <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 20 }}>Enter customer information to predict churn probability</p>

            <div className="grid grid-cols-2 gap-4">
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
                onClick={() => { setFormValues({}); setResult(null); }}
                className="px-4 py-3 rounded-xl"
                style={{ background: "#f8fafc", color: "#64748b", fontSize: 13, fontWeight: 500, border: "1px solid #e2e8f0", cursor: "pointer" }}
              >
                Clear
              </button>
            </div>

            {/* Demo data */}
            <div className="mt-4 p-3 rounded-xl flex items-start gap-2" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
              <Info size={13} color="#3b82f6" className="mt-0.5 flex-shrink-0" />
              <div style={{ fontSize: 11, color: "#1d4ed8" }}>
                <strong>Demo:</strong> Click "Predict Churn" with empty form to see a sample result for a high-risk customer profile.
              </div>
            </div>
          </div>

          {/* Result Panel */}
          <div className="col-span-12 lg:col-span-6">
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
                <div className="p-5" style={{ background: `linear-gradient(135deg, ${riskBg[result.riskTier]}, white)` }}>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>Prediction Result</div>
                  <div className="flex items-end gap-4">
                    <div>
                      <div style={{ fontSize: 52, fontWeight: 900, color: riskColor[result.riskTier], lineHeight: 1 }}>
                        {(result.churnProbability * 100).toFixed(0)}%
                      </div>
                      <div style={{ fontSize: 13, color: "#64748b" }}>Churn Probability</div>
                    </div>
                    <div className="mb-2">
                      <div className="px-4 py-2 rounded-xl" style={{ background: riskBg[result.riskTier], border: `2px solid ${riskColor[result.riskTier]}` }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: riskColor[result.riskTier] }}>{result.riskTier} RISK</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 rounded-full overflow-hidden" style={{ height: 10, background: "#e2e8f0" }}>
                    <div className="h-full rounded-full" style={{ width: `${result.churnProbability * 100}%`, background: `linear-gradient(90deg, ${riskColor[result.riskTier]}, ${riskColor[result.riskTier]}aa)`, transition: "width 0.8s ease" }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>LOW (&lt;0.40)</span>
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>MEDIUM (0.40-0.70)</span>
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>HIGH (&gt;0.70)</span>
                  </div>
                </div>

                {/* Factor Importance */}
                <div className="p-5">
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>Top Contributing Factors (SHAP)</h4>
                  <div className="space-y-3">
                    {result.topFactors.map((f, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span style={{ fontSize: 12, color: "#475569" }}>{f.feature}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#ef4444" }}>+{(f.impact * 100).toFixed(0)}%</span>
                        </div>
                        <div className="rounded-full overflow-hidden" style={{ height: 6, background: "#f1f5f9" }}>
                          <div className="h-full rounded-full" style={{ width: `${f.impact * 300}%`, background: "#ef4444aa" }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-3 rounded-xl" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#92400e", marginBottom: 4 }}>Retention Recommendation</div>
                    <div style={{ fontSize: 11, color: "#78350f" }}>This customer is in high churn risk. Consider offering a contract upgrade incentive, loyalty discount, or priority support outreach within 48 hours.</div>
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
              <div className="mt-4 flex items-center gap-3 p-3 rounded-xl" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                {batchStatus === "done" ? <CheckCircle size={16} color="#10b981" /> : <Clock size={16} color="#6366f1" className="animate-spin" />}
                <div className="flex-1">
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{batchFile}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    {batchStatus === "processing" ? "Processing..." : "Complete · 1,043 rows predicted"}
                  </div>
                </div>
                {batchStatus === "done" && (
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: "#dcfce7", color: "#16a34a", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer" }}>
                    <Download size={12} />
                    Download
                  </button>
                )}
              </div>
            )}

            <div className="mt-4">
              <h4 style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>Required CSV Columns</h4>
              <div className="flex flex-wrap gap-2">
                {["tenure", "monthlyCharges", "totalCharges", "contract", "internetService", "paymentMethod", "seniorCitizen", "numServices"].map((col) => (
                  <span key={col} className="px-2 py-1 rounded-lg" style={{ background: "#f1f5f9", color: "#475569", fontSize: 11, fontFamily: "monospace" }}>{col}</span>
                ))}
              </div>
            </div>

            <button className="mt-4 flex items-center gap-2 text-sm" style={{ color: "#6366f1", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>
              <Download size={13} /> Download CSV Template
            </button>
          </div>

          {/* Batch History */}
          <div className="col-span-12 lg:col-span-6 rounded-2xl overflow-hidden" style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: "#f1f5f9" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Batch Job History</h3>
            </div>
            <div className="divide-y" style={{ divideColor: "#f8fafc" }}>
              {[
                { name: "customers_2026-03-30.csv", date: "2026-03-30 05:00", rows: 1043, status: "done", high: 172, medium: 238 },
                { name: "customers_2026-03-29.csv", date: "2026-03-29 05:00", rows: 1038, status: "done", high: 148, medium: 225 },
                { name: "customers_2026-03-28.csv", date: "2026-03-28 05:00", rows: 1052, status: "done", high: 163, medium: 241 },
                { name: "customers_2026-03-27.csv", date: "2026-03-27 05:00", rows: 1045, status: "done", high: 156, medium: 232 },
              ].map((job, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                  <CheckCircle size={16} color="#10b981" className="flex-shrink-0" />
                  <div className="flex-1">
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{job.name}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{job.date} · {job.rows.toLocaleString()} rows</div>
                    <div className="flex gap-2 mt-1">
                      <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 600 }}>HIGH: {job.high}</span>
                      <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 600 }}>MED: {job.medium}</span>
                    </div>
                  </div>
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg" style={{ background: "#f8fafc", color: "#64748b", fontSize: 11, border: "1px solid #e2e8f0", cursor: "pointer" }}>
                    <Download size={11} /> CSV
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
