import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Users, Building2, Activity, RefreshCw, ChevronRight, Settings, CheckCircle2, XCircle, Loader2, Radio } from "lucide-react";

const AUTH_API = import.meta.env.VITE_AUTH_API_URL ?? "http://localhost:8088";

const SERVICES = [
  { name: "User Auth",      port: 8088, path: "/actuator/health" },
  { name: "Campaign",       port: 8084, path: "/actuator/health" },
  { name: "Bidding",        port: 8082, path: "/actuator/health" },
  { name: "Ad Exchange",    port: 8096, path: "/actuator/health" },
  { name: "Ad Channel",     port: 8090, path: "/actuator/health" },
  { name: "Audience",       port: 8089, path: "/actuator/health" },
  { name: "Billing",        port: 8083, path: "/actuator/health" },
  { name: "Payment",        port: 8087, path: "/actuator/health" },
  { name: "Creative",       port: 8092, path: "/actuator/health" },
  { name: "Tracking",       port: 8093, path: "/actuator/health" },
  { name: "Reports",        port: 8091, path: "/actuator/health" },
  { name: "Invoice",        port: 8086, path: "/actuator/health" },
  { name: "Fee Mgmt",       port: 8085, path: "/actuator/health" },
  { name: "Social Sync",    port: 8095, path: "/actuator/health" },
];

type HealthStatus = "up" | "down" | "checking";

function getToken() { return localStorage.getItem("dsp_admin_token") ?? ""; }

export function PlatformAdminDashboard() {
  const [userCount,   setUserCount]   = useState<number | null>(null);
  const [tenantCount, setTenantCount] = useState<number | null>(null);
  const [health, setHealth] = useState<Record<string, HealthStatus>>({});
  const [healthChecking, setHealthChecking] = useState(false);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${getToken()}` };
    fetch(`${AUTH_API}/auth/users`, { headers })
      .then(r => r.json()).then(d => setUserCount(Array.isArray(d) ? d.length : null)).catch(() => {});
    fetch(`${AUTH_API}/api/tenants`, { headers })
      .then(r => r.json()).then(d => setTenantCount(Array.isArray(d) ? d.length : null)).catch(() => {});
  }, []);

  const checkHealth = useCallback(async () => {
    setHealthChecking(true);
    const init: Record<string, HealthStatus> = {};
    SERVICES.forEach(s => { init[s.name] = "checking"; });
    setHealth(init);

    await Promise.all(SERVICES.map(async (svc) => {
      try {
        const res = await fetch(`http://localhost:${svc.port}${svc.path}`, { signal: AbortSignal.timeout(3000) });
        const status: HealthStatus = res.ok ? "up" : "down";
        setHealth(prev => ({ ...prev, [svc.name]: status }));
      } catch {
        setHealth(prev => ({ ...prev, [svc.name]: "down" }));
      }
    }));
    setHealthChecking(false);
  }, []);

  const upCount   = Object.values(health).filter(s => s === "up").length;
  const downCount = Object.values(health).filter(s => s === "down").length;
  const hasHealth = Object.keys(health).length > 0;

  const stats = [
    { label: "Total Tenants", value: tenantCount ?? "—", icon: Building2,  color: "bg-blue-500",    to: "/platform-admin/tenants" },
    { label: "Total Users",   value: userCount   ?? "—", icon: Users,       color: "bg-indigo-500",  to: "/platform-admin/users" },
    { label: "Services Up",   value: hasHealth ? `${upCount}/${SERVICES.length}` : "—", icon: Activity, color: upCount === SERVICES.length ? "bg-emerald-500" : "bg-amber-500", to: null },
    { label: "Services Down", value: hasHealth ? downCount : "—", icon: Radio, color: downCount > 0 ? "bg-red-500" : "bg-emerald-500", to: null },
  ];

  const quickLinks = [
    { label: "User Management",   icon: Users,      to: "/platform-admin/users" },
    { label: "Tenant Management", icon: Building2,  to: "/platform-admin/tenants" },
    { label: "System Settings",   icon: Settings,   to: "/platform-admin/settings" },
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

      {/* Service Health */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider">Microservice Health</h3>
          <button
            onClick={checkHealth}
            disabled={healthChecking}
            className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${healthChecking ? "animate-spin" : ""}`} />
            {healthChecking ? "Checking..." : "Check All"}
          </button>
        </div>
        {!hasHealth ? (
          <p className="text-sm text-neutral-400 text-center py-4">Click "Check All" to ping all microservices</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {SERVICES.map(svc => {
              const s = health[svc.name] ?? "checking";
              return (
                <div key={svc.name} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
                  s === "up"       ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                  s === "down"     ? "bg-red-50 border-red-200 text-red-600" :
                                     "bg-neutral-50 border-neutral-200 text-neutral-500"
                }`}>
                  {s === "checking" ? <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" /> :
                   s === "up"       ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> :
                                      <XCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                  <span className="truncate">{svc.name}</span>
                  <span className="ml-auto text-[10px] opacity-60">:{svc.port}</span>
                </div>
              );
            })}
          </div>
        )}
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
