import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  UploadCloud, Play, CheckCircle, AlertCircle, FileText,
  RefreshCw, Clock, XCircle, Loader2, Zap, AlertTriangle, Activity,
} from "lucide-react";

const MAX_CONCURRENT = 5;
const POLL_INTERVAL_MS = 10_000;
const API_BASE = "http://localhost:8000/api/v1/training";

// ── Types ──────────────────────────────────────────────────────────────────
interface DagRun {
  dag_run_id: string;
  state: "running" | "success" | "failed" | "queued" | "up_for_retry" | string;
  start_date: string | null;
  end_date: string | null;
  conf: { dataset_path?: string };
}

interface DagStatusResponse {
  status: "success" | "error";
  running_count: number;
  runs: DagRun[];
  message?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function calcDuration(start: string | null, end: string | null): string {
  if (!start) return "—";
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const secs = Math.floor((e - s) / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  return mins < 60 ? `${mins}m ${secs % 60}s` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function shortenRunId(id: string): string {
  // retrain_pipeline__2026-05-02T08:00:00+00:00__manual_xyz → show last 20 chars
  return id.length > 36 ? "…" + id.slice(-30) : id;
}

// ── State badge ────────────────────────────────────────────────────────────
function StateBadge({ state }: { state: string }) {
  const cfg: Record<string, { bg: string; color: string; icon: React.ReactNode; label: string }> = {
    running:      { bg: "#fffbeb", color: "#d97706", icon: <Loader2 size={11} className="animate-spin" />, label: "Running" },
    queued:       { bg: "#eff6ff", color: "#2563eb", icon: <Clock size={11} />, label: "Queued" },
    success:      { bg: "#f0fdf4", color: "#16a34a", icon: <CheckCircle size={11} />, label: "Success" },
    failed:       { bg: "#fef2f2", color: "#dc2626", icon: <XCircle size={11} />, label: "Failed" },
    up_for_retry: { bg: "#fff7ed", color: "#ea580c", icon: <RefreshCw size={11} />, label: "Retrying" },
  };
  const c = cfg[state] ?? { bg: "#f8fafc", color: "#64748b", icon: <Activity size={11} />, label: state };
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold"
      style={{ background: c.bg, color: c.color, fontSize: 11 }}
    >
      {c.icon} {c.label}
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export function Training() {
  // --- Upload state ---
  const [file, setFile] = useState<File | null>(null);
  const [datasetPath, setDatasetPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");

  // --- Trigger state ---
  const [triggering, setTriggering] = useState(false);
  const [triggerStatus, setTriggerStatus] = useState<"idle" | "success" | "error">("idle");

  // --- DAG status ---
  const [dagData, setDagData] = useState<DagStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [pollingError, setPollingError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // --- Generic error ---
  const [errorMessage, setErrorMessage] = useState("");

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── DAG status polling ────────────────────────────────────────────────────
  const fetchDagStatus = useCallback(async (showLoader = false) => {
    if (showLoader) setLoadingStatus(true);
    try {
      const res = await fetch(`${API_BASE}/dag-status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: DagStatusResponse = await res.json();
      setDagData(data);
      setPollingError(data.status === "error" ? (data.message ?? "Airflow unreachable") : null);
      setLastRefreshed(new Date());
    } catch (err: any) {
      setPollingError(err.message ?? "Failed to reach backend");
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchDagStatus(true);
    pollingRef.current = setInterval(() => fetchDagStatus(false), POLL_INTERVAL_MS);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [fetchDagStatus]);

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setUploadStatus("idle");
      setTriggerStatus("idle");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadStatus("idle");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData });
      if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
      const data = await res.json();
      setDatasetPath(data.dataset_path);
      setUploadStatus("success");
    } catch (err: any) {
      setUploadStatus("error");
      setErrorMessage(err.message ?? "Unknown upload error");
    } finally {
      setUploading(false);
    }
  };

  // ── Trigger ───────────────────────────────────────────────────────────────
  const handleTrigger = async () => {
    if (!datasetPath) return;
    setTriggering(true);
    setTriggerStatus("idle");
    try {
      const res = await fetch(`${API_BASE}/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset_path: datasetPath }),
      });
      if (!res.ok) throw new Error(`Trigger failed: ${res.statusText}`);
      setTriggerStatus("success");
      // Refresh status immediately after triggering
      setTimeout(() => fetchDagStatus(false), 1500);
    } catch (err: any) {
      setTriggerStatus("error");
      setErrorMessage(err.message ?? "Unknown error while triggering Airflow");
    } finally {
      setTriggering(false);
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const runningCount = dagData?.running_count ?? 0;
  const isAtCapacity = runningCount >= MAX_CONCURRENT;
  const canTrigger   = !!datasetPath && !triggering && !isAtCapacity;

  const statusCounts = {
    running: dagData?.runs.filter(r => r.state === "running").length ?? 0,
    queued:  dagData?.runs.filter(r => r.state === "queued").length ?? 0,
    success: dagData?.runs.filter(r => r.state === "success").length ?? 0,
    failed:  dagData?.runs.filter(r => r.state === "failed").length ?? 0,
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Model Training Pipeline</h1>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock size={12} />
          {lastRefreshed
            ? `Auto-refreshed: ${lastRefreshed.toLocaleTimeString("vi-VN")}`
            : "Connecting to Airflow…"}
        </div>
      </div>

      {/* ① Upload */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <UploadCloud size={18} className="text-indigo-500" />
          1. Upload Training Dataset
        </h2>

        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50">
          <input type="file" accept=".csv" onChange={handleFileChange}
            className="hidden" id="file-upload" />
          <label htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center border border-slate-100 text-indigo-500">
              <FileText size={24} />
            </div>
            <div className="text-slate-600 font-medium">
              {file ? file.name : "Click to select a CSV dataset"}
            </div>
            <div className="text-slate-400 text-sm">Supports .csv files only</div>
          </label>
        </div>

        {file && (
          <div className="mt-4 flex justify-end">
            <button onClick={handleUpload} disabled={uploading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-medium transition-colors flex items-center gap-2 text-sm">
              {uploading ? <><Loader2 size={14} className="animate-spin" /> Uploading…</> : "Upload Dataset"}
            </button>
          </div>
        )}

        {uploadStatus === "success" && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2 text-sm font-medium">
            <CheckCircle size={15} /> Dataset uploaded to server successfully!
          </div>
        )}
        {uploadStatus === "error" && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2 text-sm font-medium">
            <AlertCircle size={15} /> {errorMessage}
          </div>
        )}
      </div>

      {/* ② Pipeline Status */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2">
            <Activity size={18} className="text-indigo-500" />
            2. Airflow Pipeline Status
          </h2>
          <div className="flex items-center gap-3">
            {/* Capacity indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ background: isAtCapacity ? "#fef2f2" : runningCount >= 3 ? "#fffbeb" : "#f0fdf4" }}>
              <div className="flex gap-0.5">
                {Array.from({ length: MAX_CONCURRENT }).map((_, i) => (
                  <div key={i} className="w-3 h-3 rounded-sm"
                    style={{
                      background: i < runningCount
                        ? (isAtCapacity ? "#dc2626" : runningCount >= 3 ? "#f59e0b" : "#16a34a")
                        : "#e2e8f0",
                    }} />
                ))}
              </div>
              <span className="text-xs font-bold"
                style={{ color: isAtCapacity ? "#dc2626" : runningCount >= 3 ? "#d97706" : "#16a34a" }}>
                {runningCount}/{MAX_CONCURRENT} active
              </span>
            </div>
            <button
              onClick={() => fetchDagStatus(false)}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
              title="Refresh now">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Summary pills */}
        <div className="flex gap-3 px-6 py-3 bg-slate-50 border-b border-slate-100">
          {[
            { label: "Running", count: statusCounts.running, color: "#d97706", bg: "#fffbeb" },
            { label: "Queued",  count: statusCounts.queued,  color: "#2563eb", bg: "#eff6ff" },
            { label: "Success", count: statusCounts.success, color: "#16a34a", bg: "#f0fdf4" },
            { label: "Failed",  count: statusCounts.failed,  color: "#dc2626", bg: "#fef2f2" },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
              style={{ background: s.bg, color: s.color }}>
              <span className="text-sm font-bold">{s.count}</span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="p-6">
          {pollingError && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg flex items-center gap-2 text-sm">
              <AlertTriangle size={15} /> Airflow unreachable — {pollingError}. Showing last known state.
            </div>
          )}

          {loadingStatus ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 rounded-lg bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : !dagData?.runs?.length ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No DAG runs found. Trigger your first training pipeline below.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["Run ID", "Status", "Started", "Ended", "Duration", "Dataset"].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dagData.runs.map(run => (
                    <tr key={run.dag_run_id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-mono text-xs text-slate-500"
                          title={run.dag_run_id}>
                          {shortenRunId(run.dag_run_id)}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <StateBadge state={run.state} />
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(run.start_date)}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(run.end_date)}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-500 font-medium">
                        {run.state === "running"
                          ? <span className="text-amber-600 flex items-center gap-1">
                              <Loader2 size={10} className="animate-spin" />
                              {calcDuration(run.start_date, null)}
                            </span>
                          : calcDuration(run.start_date, run.end_date)}
                      </td>
                      <td className="py-3 px-3">
                        {run.conf?.dataset_path ? (
                          <span className="font-mono text-xs text-slate-400"
                            title={run.conf.dataset_path}>
                            {run.conf.dataset_path.split(/[\\/]/).pop()}
                          </span>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ③ Trigger */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-base font-semibold text-slate-700 mb-2 flex items-center gap-2">
          <Play size={18} className="text-emerald-500" />
          3. Trigger Training Pipeline
        </h2>

        <p className="text-slate-400 text-sm mb-5">
          Triggers an Airflow DAG run to train the XGBoost model on the uploaded dataset.
          The model will be logged to MLflow and registered as <code className="bg-slate-100 px-1 rounded text-slate-600">pending</code>.
        </p>

        {/* Capacity warning */}
        {isAtCapacity && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2 text-sm font-medium">
            <AlertTriangle size={15} />
            Limit reached — {runningCount} training tasks are currently active.
            Wait for one to complete before launching another.
          </div>
        )}
        {!isAtCapacity && runningCount >= 3 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl flex items-center gap-2 text-sm">
            <AlertTriangle size={14} />
            {runningCount} active tasks — {MAX_CONCURRENT - runningCount} slot(s) remaining.
          </div>
        )}

        <button
          onClick={handleTrigger}
          disabled={!canTrigger}
          className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all text-sm ${
            canTrigger
              ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-200"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          }`}
        >
          {triggering
            ? <><Loader2 size={16} className="animate-spin" /> Triggering…</>
            : <><Zap size={16} /> Start Training Pipeline</>}
        </button>

        {!datasetPath && !triggering && (
          <p className="mt-2 text-center text-xs text-slate-400">Upload a dataset first to enable this button.</p>
        )}

        {triggerStatus === "success" && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center gap-2 text-sm font-medium">
            <CheckCircle size={15} />
            Airflow DAG triggered! The run will appear in the status panel above within ~10 seconds.
          </div>
        )}
        {triggerStatus === "error" && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2 text-sm font-medium">
            <AlertCircle size={15} /> {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
}
