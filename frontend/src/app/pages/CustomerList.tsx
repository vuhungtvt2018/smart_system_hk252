import React, { useState } from "react";
import { Search, Filter, ChevronUp, ChevronDown, Eye, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { customers, Customer, RiskTier } from "../data/mockData";

const riskConfig = {
  HIGH: { bg: "#fee2e2", color: "#ef4444", text: "HIGH" },
  MEDIUM: { bg: "#fffbeb", color: "#f59e0b", text: "MEDIUM" },
  LOW: { bg: "#dcfce7", color: "#10b981", text: "LOW" },
};

function RiskBadge({ tier }: { tier: RiskTier }) {
  const c = riskConfig[tier];
  return (
    <span className="px-2.5 py-1 rounded-lg inline-flex items-center" style={{ background: c.bg, color: c.color, fontSize: 11, fontWeight: 700 }}>
      {c.text}
    </span>
  );
}

function TierChangeIcon({ prev, curr }: { prev?: RiskTier; curr: RiskTier }) {
  if (!prev || prev === curr) return <Minus size={14} color="#94a3b8" />;
  const tierOrder = { HIGH: 2, MEDIUM: 1, LOW: 0 };
  if (tierOrder[curr] > tierOrder[prev]) return <TrendingUp size={14} color="#ef4444" />;
  return <TrendingDown size={14} color="#10b981" />;
}

function ProbBar({ value }: { value: number }) {
  const color = value >= 0.7 ? "#ef4444" : value >= 0.4 ? "#f59e0b" : "#10b981";
  return (
    <div className="flex items-center gap-2">
      <div className="rounded-full overflow-hidden flex-1" style={{ height: 6, background: "#f1f5f9", minWidth: 60 }}>
        <div className="h-full rounded-full" style={{ width: `${value * 100}%`, background: color }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 36, textAlign: "right" }}>
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  );
}

export function CustomerList() {
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState<RiskTier | "ALL">("ALL");
  const [sortKey, setSortKey] = useState<keyof Customer>("churnProbability");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filtered = customers
    .filter((c) => {
      const matchSearch = search === "" || c.name.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase());
      const matchTier = filterTier === "ALL" || c.riskTier === filterTier;
      return matchSearch && matchTier;
    })
    .sort((a, b) => {
      const va = a[sortKey] as any;
      const vb = b[sortKey] as any;
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const handleSort = (key: keyof Customer) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ k }: { k: keyof Customer }) =>
    sortKey === k ? (sortDir === "desc" ? <ChevronDown size={12} /> : <ChevronUp size={12} />) : <ChevronDown size={12} color="#d1d5db" />;

  const counts = { HIGH: customers.filter((c) => c.riskTier === "HIGH").length, MEDIUM: customers.filter((c) => c.riskTier === "MEDIUM").length, LOW: customers.filter((c) => c.riskTier === "LOW").length };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 rounded-xl px-3 flex-1" style={{ background: "white", border: "1px solid #e2e8f0", height: 40, minWidth: 200 }}>
          <Search size={14} color="#94a3b8" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or ID..."
            style={{ background: "transparent", border: "none", outline: "none", fontSize: 13, color: "#475569", width: "100%" }}
          />
        </div>
        {(["ALL", "HIGH", "MEDIUM", "LOW"] as const).map((tier) => {
          const isActive = filterTier === tier;
          const cfg = tier !== "ALL" ? riskConfig[tier] : null;
          return (
            <button
              key={tier}
              onClick={() => setFilterTier(tier)}
              className="flex items-center gap-1.5 px-3 rounded-xl cursor-pointer"
              style={{
                height: 40, border: "1px solid",
                borderColor: isActive ? (cfg?.color ?? "#6366f1") : "#e2e8f0",
                background: isActive ? (cfg ? cfg.bg : "#eff0fe") : "white",
                color: isActive ? (cfg?.color ?? "#6366f1") : "#64748b",
                fontSize: 13, fontWeight: isActive ? 700 : 400,
              }}
            >
              {tier}
              {tier !== "ALL" && <span style={{ fontSize: 11, fontWeight: 700 }}>({counts[tier]})</span>}
            </button>
          );
        })}
        <div className="ml-auto" style={{ fontSize: 12, color: "#94a3b8" }}>{filtered.length} customers</div>
      </div>

      <div className="flex gap-4">
        {/* Table */}
        <div className="flex-1 rounded-2xl overflow-hidden" style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
                {[
                  { key: "name", label: "Customer" },
                  { key: "riskTier", label: "Risk Tier" },
                  { key: "churnProbability", label: "Churn Probability" },
                  { key: "tenure", label: "Tenure (mo)" },
                  { key: "contract", label: "Contract" },
                  { key: "monthlyCharges", label: "Monthly ($)" },
                  { key: "lastPrediction", label: "Last Prediction" },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    className="px-4 py-3 text-left cursor-pointer select-none"
                    style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}
                    onClick={() => handleSort(key as keyof Customer)}
                  >
                    <span className="flex items-center gap-1">{label} <SortIcon k={key as keyof Customer} /></span>
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-b cursor-pointer"
                  style={{ borderColor: "#f8fafc" }}
                  onClick={() => setSelectedCustomer(c)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafe")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center rounded-lg flex-shrink-0"
                        style={{ width: 32, height: 32, background: riskConfig[c.riskTier].bg }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: riskConfig[c.riskTier].color }}>
                          {c.name.split(" ").map((n) => n[0]).join("")}
                        </span>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>{c.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <RiskBadge tier={c.riskTier} />
                      <TierChangeIcon prev={c.prevRiskTier} curr={c.riskTier} />
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ minWidth: 140 }}>
                    <ProbBar value={c.churnProbability} />
                  </td>
                  <td className="px-4 py-3">
                    <span style={{ fontSize: 13, color: "#475569" }}>{c.tenure}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span style={{ fontSize: 12, color: "#475569" }}>{c.contract}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span style={{ fontSize: 13, color: "#475569" }}>${c.monthlyCharges}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>{c.lastPrediction}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="flex items-center justify-center rounded-lg" style={{ width: 28, height: 28, background: "#eff0fe" }}>
                      <Eye size={13} color="#6366f1" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Customer Detail Panel */}
        {selectedCustomer && (
          <div className="rounded-2xl p-5 flex-shrink-0" style={{ width: 280, background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
            <div className="flex items-start justify-between mb-4">
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Customer Detail</h3>
              <button onClick={() => setSelectedCustomer(null)} style={{ color: "#94a3b8", fontSize: 18, cursor: "pointer", background: "none", border: "none" }}>×</button>
            </div>

            <div className="flex flex-col items-center text-center mb-4 pb-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
              <div className="flex items-center justify-center rounded-2xl mb-3"
                style={{ width: 56, height: 56, background: riskConfig[selectedCustomer.riskTier].bg }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: riskConfig[selectedCustomer.riskTier].color }}>
                  {selectedCustomer.name.split(" ").map((n) => n[0]).join("")}
                </span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{selectedCustomer.name}</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>{selectedCustomer.id}</div>
              <div className="mt-2">
                <RiskBadge tier={selectedCustomer.riskTier} />
              </div>
            </div>

            {/* Churn Probability Gauge */}
            <div className="text-center mb-4 pb-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: riskConfig[selectedCustomer.riskTier].color }}>
                {(selectedCustomer.churnProbability * 100).toFixed(0)}%
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Churn Probability</div>
              <div className="rounded-full overflow-hidden mt-2" style={{ height: 8, background: "#f1f5f9" }}>
                <div className="h-full rounded-full" style={{ width: `${selectedCustomer.churnProbability * 100}%`, background: riskConfig[selectedCustomer.riskTier].color }} />
              </div>
            </div>

            <div className="space-y-2">
              {[
                { label: "Gender", value: selectedCustomer.gender },
                { label: "Senior Citizen", value: selectedCustomer.senior ? "Yes" : "No" },
                { label: "Tenure", value: `${selectedCustomer.tenure} months` },
                { label: "Contract", value: selectedCustomer.contract },
                { label: "Internet", value: selectedCustomer.internetService },
                { label: "Monthly Charges", value: `$${selectedCustomer.monthlyCharges}` },
                { label: "Total Charges", value: `$${selectedCustomer.totalCharges.toFixed(2)}` },
                { label: "Payment", value: selectedCustomer.paymentMethod },
                { label: "# Services", value: selectedCustomer.numServices },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>{value}</span>
                </div>
              ))}
            </div>

            <button className="w-full mt-4 py-2.5 rounded-xl" style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6)", color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}>
              Run On-Demand Prediction
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
