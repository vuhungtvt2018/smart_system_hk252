import React, { useState } from "react";
import { Plus, Search, Edit2, Trash2, Lock, Unlock, Key, Shield, CheckCircle, XCircle } from "lucide-react";
import { users, User, UserRole } from "../../data/mockData";

const roleConfig: Record<UserRole, { color: string; bg: string }> = {
  Admin: { color: "#6366f1", bg: "#eff0fe" },
  "Business User": { color: "#10b981", bg: "#dcfce7" },
  "ML Engineer": { color: "#f59e0b", bg: "#fef3c7" },
};

const statusConfig = {
  Active: { color: "#16a34a", bg: "#dcfce7", icon: <CheckCircle size={12} /> },
  Inactive: { color: "#94a3b8", bg: "#f1f5f9", icon: <XCircle size={12} /> },
  Locked: { color: "#dc2626", bg: "#fee2e2", icon: <Lock size={12} /> },
};

export function UserManagement() {
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<UserRole | "All">("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [localUsers, setLocalUsers] = useState(users);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "Business User" as UserRole });

  const filtered = localUsers.filter((u) => {
    const matchSearch = search === "" || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "All" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const handleToggleLock = (id: string) => {
    setLocalUsers((prev) => prev.map((u) => u.id === id ? { ...u, status: u.status === "Locked" ? "Active" : "Locked" } : u));
  };

  const handleDelete = (id: string) => {
    setLocalUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const handleAdd = () => {
    if (!newUser.name || !newUser.email) return;
    setLocalUsers((prev) => [...prev, {
      id: `u-00${prev.length + 1}`,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: "Active",
      lastLogin: "Never",
      createdAt: "2026-03-30",
      avatar: newUser.name.split(" ").map((n) => n[0]).join(""),
    }]);
    setShowAddModal(false);
    setNewUser({ name: "", email: "", role: "Business User" });
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: localUsers.length, color: "#6366f1" },
          { label: "Active", value: localUsers.filter((u) => u.status === "Active").length, color: "#10b981" },
          { label: "Inactive", value: localUsers.filter((u) => u.status === "Inactive").length, color: "#94a3b8" },
          { label: "Locked", value: localUsers.filter((u) => u.status === "Locked").length, color: "#ef4444" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-4 flex items-center gap-4" style={{ background: "white", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div className="flex items-center justify-center rounded-xl" style={{ width: 40, height: 40, background: `${s.color}18` }}>
              <Shield size={18} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 rounded-xl px-3 flex-1" style={{ background: "white", border: "1px solid #e2e8f0", height: 40, minWidth: 200 }}>
          <Search size={14} color="#94a3b8" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." style={{ background: "transparent", border: "none", outline: "none", fontSize: 13, color: "#475569", width: "100%" }} />
        </div>
        {(["All", "Admin", "Business User", "ML Engineer"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setFilterRole(r)}
            className="px-3 py-2 rounded-xl cursor-pointer"
            style={{
              background: filterRole === r ? "#eff0fe" : "white",
              color: filterRole === r ? "#6366f1" : "#64748b",
              border: "1px solid",
              borderColor: filterRole === r ? "#c7d2fe" : "#e2e8f0",
              fontSize: 13, fontWeight: filterRole === r ? 600 : 400,
            }}
          >
            {r}
          </button>
        ))}
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl ml-auto"
          style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6)", color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}
        >
          <Plus size={14} /> Add User
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
              {["User", "Role", "Status", "Last Login", "Created", "Actions"].map((h) => (
                <th key={h} className="px-5 py-3 text-left" style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const rc = roleConfig[u.role];
              const sc = statusConfig[u.status];
              return (
                <tr key={u.id} className="border-b" style={{ borderColor: "#f8fafc" }}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 36, height: 36, background: rc.bg }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: rc.color }}>{u.avatar}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="px-2.5 py-1 rounded-lg" style={{ background: rc.bg, color: rc.color, fontSize: 11, fontWeight: 600 }}>{u.role}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg w-fit" style={{ background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 600 }}>
                      {sc.icon} {u.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5" style={{ fontSize: 12, color: "#64748b" }}>{u.lastLogin}</td>
                  <td className="px-5 py-3.5" style={{ fontSize: 12, color: "#94a3b8" }}>{u.createdAt}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button className="flex items-center justify-center rounded-lg" style={{ width: 28, height: 28, background: "#eff0fe", border: "none", cursor: "pointer" }}>
                        <Edit2 size={12} color="#6366f1" />
                      </button>
                      <button onClick={() => handleToggleLock(u.id)} className="flex items-center justify-center rounded-lg" style={{ width: 28, height: 28, background: u.status === "Locked" ? "#dcfce7" : "#fef3c7", border: "none", cursor: "pointer" }}>
                        {u.status === "Locked" ? <Unlock size={12} color="#16a34a" /> : <Lock size={12} color="#d97706" />}
                      </button>
                      <button className="flex items-center justify-center rounded-lg" style={{ width: 28, height: 28, background: "#f1f5f9", border: "none", cursor: "pointer" }}>
                        <Key size={12} color="#94a3b8" />
                      </button>
                      <button onClick={() => handleDelete(u.id)} className="flex items-center justify-center rounded-lg" style={{ width: 28, height: 28, background: "#fee2e2", border: "none", cursor: "pointer" }}>
                        <Trash2 size={12} color="#ef4444" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="rounded-2xl p-6 w-full max-w-md" style={{ background: "white" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 20 }}>Add New User</h3>
            <div className="space-y-4">
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Full Name</label>
                <input value={newUser.name} onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. John Smith" className="w-full px-3 py-2.5 rounded-xl" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", outline: "none", fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Email Address</label>
                <input value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} placeholder="email@retainai.io" className="w-full px-3 py-2.5 rounded-xl" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", outline: "none", fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Role</label>
                <select value={newUser.role} onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value as UserRole }))} className="w-full px-3 py-2.5 rounded-xl" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", outline: "none", fontSize: 13 }}>
                  <option>Admin</option>
                  <option>Business User</option>
                  <option>ML Engineer</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleAdd} className="flex-1 py-2.5 rounded-xl" style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6)", color: "white", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer" }}>Create User</button>
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 rounded-xl" style={{ background: "#f8fafc", color: "#64748b", fontWeight: 500, fontSize: 13, border: "1px solid #e2e8f0", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
