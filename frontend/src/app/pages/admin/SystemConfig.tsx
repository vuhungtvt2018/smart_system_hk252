import React, { useState } from "react";
import { Save, RefreshCw, Settings, Clock, Shield, Activity, Info } from "lucide-react";

interface ConfigState {
  highThreshold: number;
  mediumThreshold: number;
  minAUC: number;
  minRecall: number;
  minF1: number;
  psiWarning: number;
  psiCritical: number;
  scheduleFreq: string;
  scheduleHour: string;
  enableDriftDetect: boolean;
  enableAutoRetrain: boolean;
  enableEmailAlerts: boolean;
  batchSize: number;
}

export function SystemConfig() {
  const [config, setConfig] = useState<ConfigState>({
    highThreshold: 70,
    mediumThreshold: 40,
    minAUC: 0.85,
    minRecall: 0.80,
    minF1: 0.75,
    psiWarning: 0.10,
    psiCritical: 0.20,
    scheduleFreq: "daily",
    scheduleHour: "05",
    enableDriftDetect: true,
    enableAutoRetrain: true,
    enableEmailAlerts: true,
    batchSize: 5000,
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const set = (key: keyof ConfigState, val: any) => setConfig((p) => ({ ...p, [key]: val }));

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Risk Tier Thresholds */}
      <div className="rounded-2xl p-6" style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center rounded-xl" style={{ width: 40, height: 40, background: "#fee2e2" }}>
            <Shield size={18} color="#ef4444" />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Risk Tier Thresholds</h3>
            <p style={{ fontSize: 12, color: "#94a3b8" }}>Define probability cutoffs for HIGH, MEDIUM, and LOW risk classification</p>
          </div>
        </div>

        {/* Visual threshold bar */}
        <div className="mb-6 rounded-xl overflow-hidden" style={{ height: 20 }}>
          <div className="flex h-full">
            <div style={{ width: `${config.mediumThreshold}%`, background: "#10b981" }} className="flex items-center justify-center">
              <span style={{ fontSize: 9, color: "white", fontWeight: 700 }}>LOW</span>
            </div>
            <div style={{ width: `${config.highThreshold - config.mediumThreshold}%`, background: "#f59e0b" }} className="flex items-center justify-center">
              <span style={{ fontSize: 9, color: "white", fontWeight: 700 }}>MEDIUM</span>
            </div>
            <div style={{ width: `${100 - config.highThreshold}%`, background: "#ef4444" }} className="flex items-center justify-center">
              <span style={{ fontSize: 9, color: "white", fontWeight: 700 }}>HIGH</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-sm" style={{ background: "#10b981" }} />
              <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>LOW Risk</label>
            </div>
            <div className="px-3 py-2.5 rounded-xl" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <span style={{ fontSize: 13, color: "#16a34a", fontWeight: 600 }}>Probability &lt; {config.mediumThreshold}%</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-sm" style={{ background: "#f59e0b" }} />
              <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>MEDIUM Threshold</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={10} max={60}
                value={config.mediumThreshold}
                onChange={(e) => set("mediumThreshold", Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl"
                style={{ background: "#f8fafc", border: "1px solid #e2e8f0", outline: "none", fontSize: 13 }}
              />
              <span style={{ fontSize: 13, color: "#94a3b8", flexShrink: 0 }}>%</span>
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{config.mediumThreshold}% – {config.highThreshold}% = MEDIUM</div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-sm" style={{ background: "#ef4444" }} />
              <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>HIGH Threshold</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={50} max={90}
                value={config.highThreshold}
                onChange={(e) => set("highThreshold", Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl"
                style={{ background: "#f8fafc", border: "1px solid #e2e8f0", outline: "none", fontSize: 13 }}
              />
              <span style={{ fontSize: 13, color: "#94a3b8", flexShrink: 0 }}>%</span>
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>≥ {config.highThreshold}% = HIGH</div>
          </div>
        </div>
      </div>

      {/* Evaluation Gate */}
      <div className="rounded-2xl p-6" style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center rounded-xl" style={{ width: 40, height: 40, background: "#eff0fe" }}>
            <Activity size={18} color="#6366f1" />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Evaluation Gate</h3>
            <p style={{ fontSize: 12, color: "#94a3b8" }}>Minimum metrics required for a model to be promoted to production</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {[
            { key: "minAUC", label: "Min AUC-ROC", hint: "Recommended: ≥ 0.85" },
            { key: "minRecall", label: "Min Recall", hint: "Required: ≥ 0.80 (KPI)" },
            { key: "minF1", label: "Min F1 Score", hint: "Required: ≥ 0.75 (KPI)" },
          ].map(({ key, label, hint }) => (
            <div key={key}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>{label}</label>
              <input
                type="number"
                step={0.01} min={0} max={1}
                value={config[key as keyof ConfigState] as number}
                onChange={(e) => set(key as keyof ConfigState, Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl"
                style={{ background: "#f8fafc", border: "1px solid #e2e8f0", outline: "none", fontSize: 13 }}
              />
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{hint}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Drift Detection */}
      <div className="rounded-2xl p-6" style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center rounded-xl" style={{ width: 40, height: 40, background: "#fef3c7" }}>
            <Activity size={18} color="#d97706" />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Drift Detection (PSI)</h3>
            <p style={{ fontSize: 12, color: "#94a3b8" }}>Population Stability Index thresholds for data drift detection</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {[
            { key: "psiWarning", label: "PSI Warning Threshold", hint: "Alert sent when PSI exceeds this value", color: "#f59e0b" },
            { key: "psiCritical", label: "PSI Critical Threshold", hint: "Auto-retrain triggered above this value", color: "#ef4444" },
          ].map(({ key, label, hint, color }) => (
            <div key={key}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>{label}</label>
              <input
                type="number"
                step={0.01} min={0} max={1}
                value={config[key as keyof ConfigState] as number}
                onChange={(e) => set(key as keyof ConfigState, Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl"
                style={{ background: "#f8fafc", border: `1px solid ${color}44`, outline: "none", fontSize: 13 }}
              />
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{hint}</div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {[
            { key: "enableDriftDetect", label: "Enable Drift Detection", desc: "Monitor PSI on all features daily" },
            { key: "enableAutoRetrain", label: "Enable Auto-Retrain", desc: "Trigger training job when PSI > critical threshold" },
            { key: "enableEmailAlerts", label: "Enable Email Alerts", desc: "Send email notifications for critical events" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: "#f8fafc" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{label}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{desc}</div>
              </div>
              <button
                onClick={() => set(key as keyof ConfigState, !config[key as keyof ConfigState])}
                className="rounded-full transition-all"
                style={{
                  width: 44, height: 24, padding: "2px",
                  background: config[key as keyof ConfigState] ? "#6366f1" : "#e2e8f0",
                  border: "none", cursor: "pointer", position: "relative",
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: "50%", background: "white",
                  position: "absolute", top: 2, transition: "left 0.2s",
                  left: config[key as keyof ConfigState] ? 22 : 2,
                }} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline Schedule */}
      <div className="rounded-2xl p-6" style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center rounded-xl" style={{ width: 40, height: 40, background: "#f0f9ff" }}>
            <Clock size={18} color="#0284c7" />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Pipeline Schedule (Airflow)</h3>
            <p style={{ fontSize: 12, color: "#94a3b8" }}>Configure automated pipeline execution frequency</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Batch Inference Frequency</label>
            <select value={config.scheduleFreq} onChange={(e) => set("scheduleFreq", e.target.value)} className="w-full px-3 py-2.5 rounded-xl" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", outline: "none", fontSize: 13 }}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Execution Hour (UTC)</label>
            <select value={config.scheduleHour} onChange={(e) => set("scheduleHour", e.target.value)} className="w-full px-3 py-2.5 rounded-xl" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", outline: "none", fontSize: 13 }}>
              {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => (
                <option key={h} value={h}>{h}:00 UTC</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Batch Size</label>
            <input type="number" value={config.batchSize} onChange={(e) => set("batchSize", Number(e.target.value))} className="w-full px-3 py-2.5 rounded-xl" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", outline: "none", fontSize: 13 }} />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 rounded-xl"
          style={{ background: saved ? "#dcfce7" : "linear-gradient(90deg, #6366f1, #8b5cf6)", color: saved ? "#16a34a" : "white", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer" }}
        >
          {saved ? <><RefreshCw size={14} /> Saved!</> : <><Save size={14} /> Save Configuration</>}
        </button>
        <button className="flex items-center gap-2 px-5 py-3 rounded-xl" style={{ background: "white", color: "#64748b", fontWeight: 500, fontSize: 13, border: "1px solid #e2e8f0", cursor: "pointer" }}>
          Reset to Defaults
        </button>
        <div className="flex items-center gap-1.5 ml-auto" style={{ color: "#94a3b8", fontSize: 11 }}>
          <Info size={12} />
          Changes take effect immediately on next pipeline run
        </div>
      </div>
    </div>
  );
}
