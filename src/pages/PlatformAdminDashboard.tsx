import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Building2, Activity, ChevronRight, Settings } from "lucide-react";

const AUTH_API = import.meta.env.VITE_AUTH_API_URL ?? "http://localhost:8088";

function getToken() { return localStorage.getItem("dsp_admin_token") ?? ""; }

export function PlatformAdminDashboard() {
  const [userCount,   setUserCount]   = useState<number | null>(null);
  const [tenantCount, setTenantCount] = useState<number | null>(null);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${getToken()}` };
    fetch(`${AUTH_API}/auth/users`, { headers })
      .then(r => r.json()).then(d => setUserCount(Array.isArray(d) ? d.length : null)).catch(() => {});
    fetch(`${AUTH_API}/api/tenants`, { headers })
      .then(r => r.json()).then(d => setTenantCount(Array.isArray(d) ? d.length : null)).catch(() => {});
  }, []);

  const stats = [
    { label: "Total Tenants",  value: tenantCount ?? "—", icon: Building2, color: "bg-blue-500",    to: "/tenants" },
    { label: "Total Users",    value: userCount   ?? "—", icon: Users,     color: "bg-indigo-500",  to: "/users" },
    { label: "System Health",  value: "View",             icon: Activity,  color: "bg-emerald-500", to: "/health" },
  ];

  const quickLinks = [
    { label: "User Management",   icon: Users,     to: "/users" },
    { label: "Tenant Management", icon: Building2, to: "/tenants" },
    { label: "System Health",     icon: Activity,  to: "/health" },
    { label: "System Settings",   icon: Settings,  to: "/settings" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Platform Overview</h2>
        <p className="text-neutral-500 text-sm mt-1">Welcome back, Platform Admin</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const card = (
            <div className={`bg-white border border-neutral-200 rounded-xl p-5 shadow-sm ${s.to ? "hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all" : ""}`}>
              <div className={`w-9 h-9 ${s.color} bg-opacity-10 rounded-lg flex items-center justify-center mb-3`}>
                <s.icon className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-2xl font-bold text-neutral-900">{s.value}</p>
              <p className="text-xs text-neutral-500 mt-1">{s.label}</p>
            </div>
          );
          return s.to ? <Link key={s.label} to={s.to}>{card}</Link> : <div key={s.label}>{card}</div>;
        })}
      </div>

      {/* Quick links */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-neutral-700 mb-4 uppercase tracking-wider">Quick Actions</h3>
        <div className="space-y-2">
          {quickLinks.map(({ label, icon: Icon, to }) => (
            <Link key={label} to={to} className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 transition-colors group">
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-indigo-500" />
                <span className="text-sm text-neutral-700 group-hover:text-neutral-900">{label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
