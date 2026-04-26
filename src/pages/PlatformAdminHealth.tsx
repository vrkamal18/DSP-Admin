import { useEffect, useState, useCallback, useRef } from "react";
import { RefreshCw, CheckCircle2, XCircle, Loader2, Clock, Wifi, WifiOff, Activity } from "lucide-react";

type HealthStatus = "up" | "down" | "checking";

interface ServiceDef {
  name: string;
  port: number;
  path: string;
  category: string;
}

interface ServiceHealth {
  status: HealthStatus;
  responseMs: number | null;
  checkedAt: Date | null;
}

const SERVICES: ServiceDef[] = [
  { name: "User Auth",    port: 8088, path: "/actuator/health", category: "Core" },
  { name: "Campaign",     port: 8084, path: "/actuator/health", category: "Core" },
  { name: "Creative",     port: 8092, path: "/actuator/health", category: "Core" },
  { name: "Audience",     port: 8089, path: "/actuator/health", category: "Core" },
  { name: "Bidding",      port: 8082, path: "/actuator/health", category: "RTB" },
  { name: "Ad Exchange",  port: 8096, path: "/actuator/health", category: "RTB" },
  { name: "Ad Channel",   port: 8090, path: "/actuator/health", category: "RTB" },
  { name: "Tracking",     port: 8093, path: "/actuator/health", category: "RTB" },
  { name: "Billing",      port: 8083, path: "/actuator/health", category: "Finance" },
  { name: "Payment",      port: 8087, path: "/actuator/health", category: "Finance" },
  { name: "Invoice",      port: 8086, path: "/actuator/health", category: "Finance" },
  { name: "Fee Mgmt",     port: 8085, path: "/actuator/health", category: "Finance" },
  { name: "Reports",      port: 8091, path: "/actuator/health", category: "Analytics" },
  { name: "Social Sync",  port: 8095, path: "/actuator/health", category: "Analytics" },
];

const CATEGORIES = ["Core", "RTB", "Finance", "Analytics"];

const categoryColors: Record<string, string> = {
  Core:      "bg-indigo-50 text-indigo-700 border-indigo-200",
  RTB:       "bg-violet-50 text-violet-700 border-violet-200",
  Finance:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  Analytics: "bg-amber-50 text-amber-700 border-amber-200",
};

export function PlatformAdminHealth() {
  const [health, setHealth]       = useState<Record<string, ServiceHealth>>({});
  const [checking, setChecking]   = useState(false);
  const [lastRun, setLastRun]     = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkAll = useCallback(async () => {
    setChecking(true);
    const init: Record<string, ServiceHealth> = {};
    SERVICES.forEach(s => { init[s.name] = { status: "checking", responseMs: null, checkedAt: null }; });
    setHealth(init);

    await Promise.all(SERVICES.map(async (svc) => {
      const start = Date.now();
      try {
        const res = await fetch(`http://localhost:${svc.port}${svc.path}`, {
          signal: AbortSignal.timeout(4000),
        });
        const ms = Date.now() - start;
        setHealth(prev => ({
          ...prev,
          [svc.name]: { status: res.ok ? "up" : "down", responseMs: ms, checkedAt: new Date() },
        }));
      } catch {
        setHealth(prev => ({
          ...prev,
          [svc.name]: { status: "down", responseMs: null, checkedAt: new Date() },
        }));
      }
    }));

    setLastRun(new Date());
    setChecking(false);
  }, []);

  useEffect(() => { checkAll(); }, [checkAll]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(checkAll, 30000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, checkAll]);

  const upCount   = Object.values(health).filter(h => h.status === "up").length;
  const downCount = Object.values(health).filter(h => h.status === "down").length;
  const total     = SERVICES.length;

  const overallStatus = downCount === 0 && upCount === total
    ? "operational"
    : downCount === total
    ? "outage"
    : downCount > 0
    ? "degraded"
    : "checking";

  const overallBanner = {
    operational: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", icon: CheckCircle2, label: "All Systems Operational" },
    degraded:    { bg: "bg-amber-50 border-amber-200",     text: "text-amber-700",   icon: Activity,      label: `Degraded — ${downCount} service${downCount > 1 ? "s" : ""} down` },
    outage:      { bg: "bg-red-50 border-red-200",         text: "text-red-600",     icon: XCircle,       label: "Major Outage — All services down" },
    checking:    { bg: "bg-neutral-50 border-neutral-200", text: "text-neutral-500", icon: Loader2,       label: "Checking services..." },
  }[overallStatus];

  function speedLabel(ms: number | null) {
    if (ms === null) return null;
    if (ms < 300)  return { label: `${ms}ms`, color: "text-emerald-600" };
    if (ms < 1000) return { label: `${ms}ms`, color: "text-amber-500" };
    return { label: `${ms}ms`, color: "text-red-500" };
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">System Health</h2>
          <p className="text-neutral-500 text-sm mt-1">
            {lastRun ? `Last checked: ${lastRun.toLocaleTimeString()}` : "Checking..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(a => !a)}
            className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border transition-colors ${
              autoRefresh
                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                : "bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50"
            }`}
            title="Auto-refresh every 30s"
          >
            {autoRefresh ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            Auto {autoRefresh ? "ON" : "OFF"}
          </button>
          <button
            onClick={checkAll}
            disabled={checking}
            className="flex items-center gap-2 text-sm text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Checking..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Overall status banner */}
      <div className={`flex items-center gap-3 px-5 py-4 rounded-xl border mb-6 ${overallBanner.bg}`}>
        <overallBanner.icon className={`w-5 h-5 ${overallBanner.text} ${overallStatus === "checking" ? "animate-spin" : ""}`} />
        <div className="flex-1">
          <p className={`font-semibold ${overallBanner.text}`}>{overallBanner.label}</p>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="text-emerald-600 font-medium">{upCount} up</span>
          <span className="text-red-500 font-medium">{downCount} down</span>
          <span className="text-neutral-400">{total} total</span>
        </div>
      </div>

      {/* Services by category */}
      {CATEGORIES.map(cat => {
        const catServices = SERVICES.filter(s => s.category === cat);
        return (
          <div key={cat} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${categoryColors[cat]}`}>{cat}</span>
              <span className="text-xs text-neutral-400">
                {catServices.filter(s => health[s.name]?.status === "up").length}/{catServices.length} up
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {catServices.map(svc => {
                const h = health[svc.name];
                const status = h?.status ?? "checking";
                const speed  = speedLabel(h?.responseMs ?? null);
                return (
                  <div
                    key={svc.name}
                    className={`bg-white border rounded-xl px-4 py-3.5 flex items-center gap-3 shadow-sm transition-all ${
                      status === "down" ? "border-red-200 bg-red-50/30" : "border-neutral-200"
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {status === "up"       && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                      {status === "down"     && <XCircle      className="w-5 h-5 text-red-500" />}
                      {status === "checking" && <Loader2      className="w-5 h-5 text-neutral-300 animate-spin" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-800 truncate">{svc.name}</p>
                      <p className="text-xs text-neutral-400">:{svc.port}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {status === "up" && speed && (
                        <p className={`text-xs font-medium ${speed.color}`}>{speed.label}</p>
                      )}
                      {status === "down" && (
                        <p className="text-xs font-medium text-red-500">Unreachable</p>
                      )}
                      {status === "checking" && (
                        <p className="text-xs text-neutral-300 flex items-center gap-1"><Clock className="w-3 h-3" /> wait</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
