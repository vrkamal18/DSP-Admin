import { useEffect, useState } from "react";
import { RefreshCw, Search, Pencil, Trash2, AlertTriangle, Plus, X, PauseCircle, PlayCircle, Building2, CheckCircle2, PauseOctagon, Layers, Users } from "lucide-react";
import { Input } from "../components/ui/input";

const AUTH_API = import.meta.env.VITE_AUTH_API_URL ?? "http://localhost:8088";
const PLANS    = ["STARTER", "GROWTH", "ENTERPRISE"];
const STATUSES = ["ACTIVE", "SUSPENDED", "CANCELLED"];

interface Tenant {
  id: number;
  name: string;
  plan: string;
  status: string;
  maxUsers: number;
  maxCampaigns: number;
  subTenancyEnabled: boolean;
  createdAt: string;
}

interface TenantForm {
  name: string;
  plan: string;
  status: string;
  maxUsers: number;
  maxCampaigns: number;
  subTenancyEnabled: boolean;
}

const EMPTY_FORM: TenantForm = { name: "", plan: "STARTER", status: "ACTIVE", maxUsers: 5, maxCampaigns: 10, subTenancyEnabled: false };

const planColors: Record<string, string> = {
  ENTERPRISE: "bg-violet-100 text-violet-700 border border-violet-200",
  GROWTH:     "bg-blue-100 text-blue-700 border border-blue-200",
  STARTER:    "bg-neutral-100 text-neutral-600 border border-neutral-200",
};

const statusColors: Record<string, string> = {
  ACTIVE:    "bg-emerald-100 text-emerald-700",
  SUSPENDED: "bg-amber-100 text-amber-700",
  CANCELLED: "bg-red-100 text-red-700",
};

interface TenantUser {
  id: number;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  status?: string;
}

function getToken() { return localStorage.getItem("dsp_admin_token") ?? ""; }

function TenantUsersModal({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const [users, setUsers]     = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    fetch(`${AUTH_API}/api/tenants/${tenant.id}/users`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setUsers)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [tenant.id]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white border border-neutral-200 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Users — {tenant.name}</h2>
              <p className="text-xs text-neutral-400">{tenant.plan} · {tenant.status}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto">
          {loading && <p className="text-sm text-neutral-400 text-center py-6">Loading users...</p>}
          {error   && <p className="text-sm text-red-500 text-center py-6">{error}</p>}
          {!loading && !error && users.length === 0 && (
            <p className="text-sm text-neutral-400 text-center py-6">No users under this tenant</p>
          )}
          {!loading && users.map(u => {
            const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ");
            return (
              <div key={u.id} className="flex items-center gap-3 py-2.5 border-b border-neutral-100 last:border-0">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 flex-shrink-0">
                  {(u.email ?? u.username ?? "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-800 truncate">{u.email}</p>
                  {fullName && <p className="text-xs text-neutral-400">{fullName}</p>}
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {(u.roles ?? []).map(r => (
                    <span key={r} className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">
                      {r.replace("ROLE_", "")}
                    </span>
                  ))}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                  u.status?.toUpperCase() === "VERIFIED" || u.status?.toUpperCase() === "ACTIVE"
                    ? "bg-emerald-100 text-emerald-700"
                    : u.status?.toUpperCase() === "SUSPENDED"
                    ? "bg-red-100 text-red-600"
                    : "bg-amber-100 text-amber-700"
                }`}>{u.status ?? "—"}</span>
              </div>
            );
          })}
        </div>
        <div className="px-6 py-3 border-t border-neutral-100 text-xs text-neutral-400 text-right">
          {users.length} user{users.length !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}

function TenantModal({ tenant, onClose, onSaved }: {
  tenant: Tenant | null;
  onClose: () => void;
  onSaved: (t: Tenant) => void;
}) {
  const isEdit = !!tenant;
  const [form, setForm] = useState<TenantForm>(
    isEdit
      ? { name: tenant.name, plan: tenant.plan, status: tenant.status,
          maxUsers: tenant.maxUsers, maxCampaigns: tenant.maxCampaigns,
          subTenancyEnabled: tenant.subTenancyEnabled }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Tenant name is required."); return; }
    setSaving(true); setError("");
    try {
      const url    = isEdit ? `${AUTH_API}/api/tenants/${tenant!.id}` : `${AUTH_API}/api/tenants`;
      const method = isEdit ? "PUT" : "POST";
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message ?? `HTTP ${res.status}`); }
      onSaved(await res.json());
    } catch (err: any) {
      setError(err.message ?? "Failed to save tenant");
    } finally {
      setSaving(false);
    }
  }

  const field = "bg-white border border-neutral-300 text-neutral-900 text-sm rounded-lg px-3 py-2 w-full focus:outline-none focus:border-indigo-500";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white border border-neutral-200 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <h2 className="text-base font-semibold text-neutral-900">{isEdit ? "Edit Tenant" : "Create Tenant"}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Tenant Name *</label>
            <input className={field} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Acme Corp" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Plan</label>
              <select className={field} value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}>
                {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Status</label>
              <select className={field} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Max Users</label>
              <input type="number" min={1} className={field} value={form.maxUsers}
                onChange={e => setForm(f => ({ ...f, maxUsers: parseInt(e.target.value) || 1 }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Max Campaigns</label>
              <input type="number" min={1} className={field} value={form.maxCampaigns}
                onChange={e => setForm(f => ({ ...f, maxCampaigns: parseInt(e.target.value) || 1 }))} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="subTenancy" checked={form.subTenancyEnabled}
              onChange={e => setForm(f => ({ ...f, subTenancyEnabled: e.target.checked }))}
              className="w-4 h-4 rounded border-neutral-300 text-indigo-500" />
            <label htmlFor="subTenancy" className="text-sm text-neutral-700">Enable Sub-Tenancy</label>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-neutral-300 text-sm text-neutral-600 rounded-lg hover:bg-neutral-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-500 disabled:opacity-50">
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Tenant"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function PlatformAdminTenants() {
  const [tenants, setTenants]                 = useState<Tenant[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [search, setSearch]                   = useState("");
  const [modalTenant, setModalTenant]         = useState<Tenant | null | "new">(undefined as any);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting]               = useState(false);
  const [togglingId, setTogglingId]           = useState<number | null>(null);
  const [viewUsersTenant, setViewUsersTenant] = useState<Tenant | null>(null);

  async function fetchTenants() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${AUTH_API}/api/tenants`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTenants(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load tenants");
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchTenants(); }, []);

  async function toggleStatus(t: Tenant) {
    setTogglingId(t.id);
    const newStatus = t.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      const res = await fetch(`${AUTH_API}/api/tenants/${t.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ...t, status: newStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTenants(prev => prev.map(x => x.id === t.id ? { ...x, status: newStatus } : x));
    } catch (e: any) { setError(e.message); }
    finally { setTogglingId(null); }
  }

  async function deleteTenant(id: number) {
    setDeleting(true);
    try {
      const res = await fetch(`${AUTH_API}/api/tenants/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTenants(prev => prev.filter(x => x.id !== id));
      setConfirmDeleteId(null);
    } catch (e: any) { setError(e.message); }
    finally { setDeleting(false); }
  }

  const activeCount     = tenants.filter(t => t.status?.toUpperCase() === "ACTIVE").length;
  const suspendedCount  = tenants.filter(t => t.status?.toUpperCase() === "SUSPENDED").length;
  const enterpriseCount = tenants.filter(t => t.plan?.toUpperCase() === "ENTERPRISE").length;

  const filtered = tenants.filter(t => t.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Tenants</h2>
          <p className="text-neutral-500 text-sm mt-1">{tenants.length} tenants</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchTenants} className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-3 py-2 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={() => setModalTenant("new")} className="flex items-center gap-2 text-sm text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> New Tenant
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total",      value: tenants.length,  icon: Building2,    color: "text-indigo-600 bg-indigo-50" },
          { label: "Active",     value: activeCount,     icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
          { label: "Suspended",  value: suspendedCount,  icon: PauseOctagon, color: "text-amber-600 bg-amber-50" },
          { label: "Enterprise", value: enterpriseCount, icon: Layers,       color: "text-violet-600 bg-violet-50" },
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
        <Input placeholder="Search tenants..." value={search} onChange={e => setSearch(e.target.value)}
          className="bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400 pl-9" />
      </div>

      {error && <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}
      {loading && <div className="text-center text-neutral-400 py-12">Loading tenants...</div>}

      {!loading && (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-neutral-500 text-xs uppercase tracking-wider bg-neutral-50">
                <th className="text-left px-5 py-3">Tenant</th>
                <th className="text-left px-5 py-3">Plan</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Users</th>
                <th className="text-left px-5 py-3">Campaigns</th>
                <th className="text-left px-5 py-3">Sub-Tenancy</th>
                <th className="text-left px-5 py-3">Created</th>
                <th className="text-left px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center text-neutral-400 py-10">{search ? "No tenants match your search" : "No tenants found"}</td></tr>
              )}
              {filtered.map(t => (
                <tr key={t.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                        {t.name?.[0]?.toUpperCase() ?? "T"}
                      </div>
                      <div>
                        <p className="text-neutral-800 font-medium">{t.name}</p>
                        <p className="text-neutral-400 text-xs">ID: {t.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planColors[t.plan?.toUpperCase()] ?? planColors.STARTER}`}>{t.plan ?? "—"}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[t.status?.toUpperCase()] ?? statusColors.ACTIVE}`}>{t.status ?? "—"}</span>
                  </td>
                  <td className="px-5 py-3 text-neutral-600">{t.maxUsers >= 999999 ? "∞" : t.maxUsers}</td>
                  <td className="px-5 py-3 text-neutral-600">{t.maxCampaigns >= 999999 ? "∞" : t.maxCampaigns}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${t.subTenancyEnabled ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>
                      {t.subTenancyEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-neutral-400 text-xs">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}</td>
                  <td className="px-5 py-3">
                    {confirmDeleteId === t.id ? (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs text-neutral-700">Delete?</span>
                        <button onClick={() => deleteTenant(t.id)} disabled={deleting} className="text-xs text-red-600 hover:text-red-500 font-medium disabled:opacity-50">Yes</button>
                        <span className="text-neutral-300">·</span>
                        <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-neutral-500 hover:text-neutral-700">No</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button onClick={() => setViewUsersTenant(t)} className="text-neutral-400 hover:text-indigo-500 transition-colors" title="View users">
                          <Users className="w-4 h-4" />
                        </button>
                        <button onClick={() => setModalTenant(t)} className="text-neutral-400 hover:text-indigo-500 transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleStatus(t)} disabled={togglingId === t.id} className={`transition-colors disabled:opacity-40 ${t.status === "ACTIVE" ? "text-neutral-400 hover:text-amber-500" : "text-neutral-400 hover:text-emerald-500"}`}
                          title={t.status === "ACTIVE" ? "Suspend" : "Reactivate"}>
                          {t.status === "ACTIVE" ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setConfirmDeleteId(t.id)} className="text-neutral-300 hover:text-red-500 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View Users Modal */}
      {viewUsersTenant && (
        <TenantUsersModal tenant={viewUsersTenant} onClose={() => setViewUsersTenant(null)} />
      )}

      {/* Create / Edit Modal */}
      {modalTenant !== undefined && (
        <TenantModal
          tenant={modalTenant === "new" ? null : modalTenant}
          onClose={() => setModalTenant(undefined as any)}
          onSaved={saved => {
            setTenants(prev => {
              const exists = prev.find(x => x.id === saved.id);
              return exists ? prev.map(x => x.id === saved.id ? saved : x) : [saved, ...prev];
            });
            setModalTenant(undefined as any);
          }}
        />
      )}
    </div>
  );
}
