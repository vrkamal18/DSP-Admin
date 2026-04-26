import { useEffect, useState } from "react";
import { RefreshCw, Search, Pencil, Check, X, Trash2, AlertTriangle, KeyRound, Plus, UserPlus, ShieldOff, ShieldCheck, Users, UserCheck, UserX, Clock } from "lucide-react";
import { Input } from "../components/ui/input";

const AUTH_API = import.meta.env.VITE_AUTH_API_URL ?? "http://localhost:8088";
const PLANS    = ["STARTER", "GROWTH", "ENTERPRISE"];
const ALL_ROLES = ["ROLE_ADVERTISER", "ROLE_ADMIN", "ROLE_VIEWER", "ROLE_FINANCE"];

interface UserSummary {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  plan: string;
  tenantId: number | null;
  status?: string;
}

function statusBadge(status?: string) {
  switch (status?.toUpperCase()) {
    case "VERIFIED":  return "bg-emerald-100 text-emerald-700";
    case "ACTIVE":    return "bg-blue-100 text-blue-700";
    case "SUSPENDED": return "bg-red-100 text-red-600";
    case "PENDING":   return "bg-amber-100 text-amber-700";
    default:          return "bg-neutral-100 text-neutral-500";
  }
}

function getToken() { return localStorage.getItem("dsp_admin_token") ?? ""; }

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: (u: UserSummary) => void }) {
  const [form, setForm] = useState({ email: "", username: "", password: "", firstName: "", lastName: "", plan: "STARTER", roles: ["ROLE_ADVERTISER"] });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const field = "bg-white border border-neutral-300 text-neutral-900 text-sm rounded-lg px-3 py-2 w-full focus:outline-none focus:border-indigo-500";

  function toggleRole(role: string) {
    setForm(f => ({ ...f, roles: f.roles.includes(role) ? f.roles.filter(r => r !== role) : [...f.roles, role] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.password) { setError("Email and password are required."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch(`${AUTH_API}/api/registration/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ...form, companyName: form.firstName + " " + form.lastName }),
      });
      if (!res.ok) { const d = await res.text(); throw new Error(d ?? `HTTP ${res.status}`); }
      onClose();
      // Trigger a refresh by calling onCreated with a placeholder - parent will refetch
      onCreated({ id: 0, username: form.username || form.email, email: form.email, roles: form.roles, plan: form.plan, tenantId: null });
    } catch (err: any) {
      setError(err.message ?? "Failed to create user");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white border border-neutral-200 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-indigo-500" />
            <h2 className="text-base font-semibold text-neutral-900">Create New User</h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">First Name</label>
              <input className={field} value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="John" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Last Name</label>
              <input className={field} value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Doe" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Email *</label>
            <input type="email" className={field} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@company.com" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Username</label>
            <input className={field} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="Leave blank to use email" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Temporary Password *</label>
            <input type="password" className={field} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 chars with upper, number, symbol" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Plan</label>
            <select className={field} value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}>
              {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-2">Roles</label>
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map(role => (
                <button key={role} type="button" onClick={() => toggleRole(role)}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    form.roles.includes(role) ? "bg-indigo-600 border-indigo-500 text-white" : "bg-white border-neutral-300 text-neutral-600 hover:border-neutral-400"
                  }`}>
                  {form.roles.includes(role) && <Check className="w-3 h-3" />}
                  {role.replace("ROLE_", "")}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-neutral-300 text-sm text-neutral-600 rounded-lg hover:bg-neutral-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-500 disabled:opacity-50">
              {saving ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function planBadge(plan: string) {
  const colors: Record<string, string> = {
    ENTERPRISE: "bg-violet-100 text-violet-700",
    GROWTH:     "bg-blue-100 text-blue-700",
    STARTER:    "bg-neutral-100 text-neutral-600",
  };
  return colors[plan?.toUpperCase()] ?? "bg-neutral-100 text-neutral-600";
}

function getAdminEmail(): string {
  return (localStorage.getItem("dsp_admin_email") ?? "").toLowerCase();
}

export function PlatformAdminUsers() {
  const [users, setUsers]         = useState<UserSummary[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState("");
  const [editingId, setEditingId]     = useState<number | null>(null);
  const [editPlan, setEditPlan]       = useState("");
  const [saving, setSaving]           = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting]           = useState(false);
  const [resetPwId, setResetPwId]         = useState<number | null>(null);
  const [newPassword, setNewPassword]     = useState("");
  const [savingPw, setSavingPw]           = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editRolesId, setEditRolesId]     = useState<number | null>(null);
  const [editRoles, setEditRoles]         = useState<string[]>([]);
  const [savingRoles, setSavingRoles]     = useState(false);

  async function fetchUsers() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${AUTH_API}/auth/users`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setUsers(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(u: UserSummary) {
    const next = u.status?.toUpperCase() === "SUSPENDED" ? "VERIFIED" : "SUSPENDED";
    try {
      const res = await fetch(`${AUTH_API}/auth/users/${u.id}/status`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated: UserSummary = await res.json();
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: updated.status } : x));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update status");
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  const adminEmail = getAdminEmail();

  function isAdmin(u: UserSummary) {
    if ((u.roles ?? []).some(r => {
      const lower = r.toLowerCase();
      return lower === "admin" || lower === "role_admin";
    })) return true;
    if (adminEmail && (
      u.email?.toLowerCase() === adminEmail ||
      u.username?.toLowerCase() === adminEmail
    )) return true;
    return false;
  }

  function isSelf(u: UserSummary) {
    return adminEmail
      ? u.email?.toLowerCase() === adminEmail || u.username?.toLowerCase() === adminEmail
      : false;
  }

  async function saveRoles(u: UserSummary) {
    setSavingRoles(true);
    try {
      const res = await fetch(`${AUTH_API}/auth/users/${u.id}/roles`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ roles: editRoles }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, roles: editRoles } : x));
      setEditRolesId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update roles");
    } finally { setSavingRoles(false); }
  }

  async function resetPassword(u: UserSummary) {
    setSavingPw(true);
    try {
      const res = await fetch(`${AUTH_API}/auth/users/${u.id}/password`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setResetPwId(null);
      setNewPassword("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to reset password");
    } finally {
      setSavingPw(false);
    }
  }

  async function deleteUser(u: UserSummary) {
    setDeleting(true);
    try {
      const res = await fetch(`${AUTH_API}/auth/users/${u.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setUsers(prev => prev.filter(x => x.id !== u.id));
      setConfirmDeleteId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete user");
    } finally {
      setDeleting(false);
    }
  }

  async function savePlan(u: UserSummary) {
    setSaving(true);
    try {
      const res = await fetch(`${AUTH_API}/auth/users/${u.id}/plan`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ plan: editPlan }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, plan: editPlan } : x));
      setEditingId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update plan");
    } finally {
      setSaving(false);
    }
  }

  const filtered = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.username?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount    = users.filter(u => ["VERIFIED","ACTIVE"].includes(u.status?.toUpperCase() ?? "")).length;
  const suspendedCount = users.filter(u => u.status?.toUpperCase() === "SUSPENDED").length;
  const pendingCount   = users.filter(u => u.status?.toUpperCase() === "PENDING").length;

  return (
    <div>
      {showCreateModal && (
        <CreateUserModal onClose={() => setShowCreateModal(false)} onCreated={() => { setShowCreateModal(false); fetchUsers(); }} />
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Users</h2>
          <p className="text-neutral-500 text-sm mt-1">{users.length} registered users</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchUsers} className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-3 py-2 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 text-sm text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> New User
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total",     value: users.length,   icon: Users,      color: "text-indigo-600 bg-indigo-50" },
          { label: "Active",    value: activeCount,    icon: UserCheck,  color: "text-emerald-600 bg-emerald-50" },
          { label: "Suspended", value: suspendedCount, icon: UserX,      color: "text-red-500 bg-red-50" },
          { label: "Pending",   value: pendingCount,   icon: Clock,      color: "text-amber-600 bg-amber-50" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-neutral-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
              <s.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-lg font-bold text-neutral-900 leading-none">{s.value}</p>
              <p className="text-xs text-neutral-500 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <Input
          placeholder="Search by email or username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400 pl-9"
        />
      </div>

      {loading && (
        <div className="text-center text-neutral-400 py-12">Loading users...</div>
      )}

      {error && (
        <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {!loading && !error && (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-neutral-500 text-xs uppercase tracking-wider bg-neutral-50">
                <th className="text-left px-5 py-3">User</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Roles</th>
                <th className="text-left px-5 py-3">Plan</th>
                <th className="text-left px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-neutral-400 py-10">
                    {search ? "No users match your search" : "No users found"}
                  </td>
                </tr>
              )}
              {filtered.map((u) => {
                const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ");
                return (
                <tr key={u.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${u.status?.toUpperCase() === "SUSPENDED" ? "bg-red-100 text-red-600" : "bg-indigo-100 text-indigo-700"}`}>
                        {(u.email ?? u.username ?? "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-neutral-800">{u.email ?? "—"}</p>
                        {fullName && <p className="text-xs text-neutral-400">{fullName}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(u.status)}`}>
                      {u.status ?? "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {editRolesId === u.id ? (
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-1">
                          {ALL_ROLES.map(role => (
                            <button key={role} type="button"
                              onClick={() => setEditRoles(r => r.includes(role) ? r.filter(x => x !== role) : [...r, role])}
                              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                                editRoles.includes(role) ? "bg-indigo-600 border-indigo-500 text-white" : "bg-white border-neutral-300 text-neutral-600"
                              }`}>
                              {role.replace("ROLE_", "")}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-1 mt-1">
                          <button onClick={() => saveRoles(u)} disabled={savingRoles} className="text-emerald-600 hover:text-emerald-500 disabled:opacity-50"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditRolesId(null)} className="text-neutral-400 hover:text-neutral-600"><X className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1 cursor-pointer group" onClick={() => { setEditRolesId(u.id); setEditRoles(u.roles ?? []); }} title="Click to edit roles">
                        {(u.roles ?? []).length > 0
                          ? u.roles.map(r => (
                              <span key={r} className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full group-hover:bg-neutral-200">{r.replace("ROLE_","")}</span>
                            ))
                          : <span className="text-neutral-300 text-xs">—</span>}
                        <Pencil className="w-3 h-3 text-neutral-300 group-hover:text-indigo-500 ml-1 self-center opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {editingId === u.id ? (
                      <select
                        value={editPlan}
                        onChange={(e) => setEditPlan(e.target.value)}
                        className="bg-white border border-neutral-300 text-neutral-900 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500"
                      >
                        {PLANS.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planBadge(u.plan)}`}>
                        {u.plan ?? "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {editingId === u.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => savePlan(u)}
                          disabled={saving}
                          className="text-emerald-600 hover:text-emerald-500 disabled:opacity-50"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-neutral-400 hover:text-neutral-600"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : confirmDeleteId === u.id ? (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="text-xs text-neutral-700">Delete?</span>
                        <button
                          onClick={() => deleteUser(u)}
                          disabled={deleting}
                          className="text-xs text-red-600 hover:text-red-500 font-medium disabled:opacity-50"
                        >
                          Yes
                        </button>
                        <span className="text-neutral-300">·</span>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs text-neutral-500 hover:text-neutral-700"
                        >
                          No
                        </button>
                      </div>
                    ) : resetPwId === u.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="New password"
                          className="text-xs bg-white border border-neutral-300 rounded px-2 py-1 text-neutral-900 w-32 focus:outline-none focus:border-indigo-400"
                          autoFocus
                        />
                        <button
                          onClick={() => resetPassword(u)}
                          disabled={savingPw || newPassword.length < 4}
                          className="text-emerald-600 hover:text-emerald-500 disabled:opacity-40"
                          title="Save password"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setResetPwId(null); setNewPassword(""); }}
                          className="text-neutral-400 hover:text-neutral-600"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => { setEditingId(u.id); setEditPlan(u.plan ?? "STARTER"); }}
                          className="text-neutral-400 hover:text-indigo-500 transition-colors"
                          title="Edit plan"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setResetPwId(u.id); setNewPassword(""); }}
                          className="text-neutral-400 hover:text-amber-500 transition-colors"
                          title="Reset password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        {!isAdmin(u) && !isSelf(u) && (
                          <>
                            <button
                              onClick={() => toggleStatus(u)}
                              className={`transition-colors ${u.status?.toUpperCase() === "SUSPENDED" ? "text-emerald-400 hover:text-emerald-600" : "text-neutral-400 hover:text-amber-500"}`}
                              title={u.status?.toUpperCase() === "SUSPENDED" ? "Activate user" : "Suspend user"}
                            >
                              {u.status?.toUpperCase() === "SUSPENDED"
                                ? <ShieldCheck className="w-4 h-4" />
                                : <ShieldOff className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(u.id)}
                              className="text-neutral-300 hover:text-red-500 transition-colors"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
