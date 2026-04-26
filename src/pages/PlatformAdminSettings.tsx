import React, { useEffect, useState, useCallback } from "react";
import {
  Info, Settings2, Monitor, Tv2, Share2, Layout, Music, MapPin, Play,
  CheckCircle2, XCircle, Loader2, Star, Zap, Lock,
} from "lucide-react";

const AUTH_API       = import.meta.env.VITE_AUTH_API_URL ?? "http://localhost:8088";
const CHANNEL_API    = import.meta.env.VITE_AD_CHANNEL_API_URL ?? "http://localhost:8090";
const COGNITO_POOL   = import.meta.env.VITE_COGNITO_USER_POOL_ID ?? "—";
const COGNITO_REGION = import.meta.env.VITE_COGNITO_REGION ?? "—";
const PLAN_TIERS_KEY = "dsp_plan_tiers";
const PLAN_ORDER: Record<string, number> = { STARTER: 0, GROWTH: 1, ENTERPRISE: 2 };

interface ChannelConfig {
  id: number; channelGroup: string; displayName: string;
  enabled: boolean; requiredPlan: "STARTER" | "GROWTH" | "ENTERPRISE"; launchDate: string | null;
}

const DEFAULT_CONFIGS: ChannelConfig[] = [
  { id: 1, channelGroup: "DISPLAY", displayName: "Display Ads",    enabled: true,  requiredPlan: "STARTER",    launchDate: null },
  { id: 2, channelGroup: "VIDEO",   displayName: "Video Ads",      enabled: false, requiredPlan: "STARTER",    launchDate: null },
  { id: 3, channelGroup: "NATIVE",  displayName: "Native Ads",     enabled: false, requiredPlan: "STARTER",    launchDate: null },
  { id: 4, channelGroup: "AUDIO",   displayName: "Audio Ads",      enabled: false, requiredPlan: "GROWTH",     launchDate: null },
  { id: 5, channelGroup: "DOOH",    displayName: "Digital OOH",    enabled: false, requiredPlan: "GROWTH",     launchDate: null },
  { id: 6, channelGroup: "OTT_CTV", displayName: "OTT / CTV",      enabled: false, requiredPlan: "ENTERPRISE", launchDate: null },
  { id: 7, channelGroup: "SOCIAL",  displayName: "Social Media",   enabled: false, requiredPlan: "ENTERPRISE", launchDate: null },
];

const PLAN_TIERS = [
  { key: "STARTER",    label: "Starter",    desc: "Free · all advertisers",  color: "border-neutral-200 bg-neutral-50",  dot: "bg-neutral-400",  ring: "ring-neutral-400" },
  { key: "GROWTH",     label: "Growth",     desc: "$99/mo · Growth plan",    color: "border-blue-200 bg-blue-50",        dot: "bg-blue-500",     ring: "ring-blue-500" },
  { key: "ENTERPRISE", label: "Enterprise", desc: "Custom · Enterprise plan", color: "border-violet-200 bg-violet-50",   dot: "bg-violet-500",   ring: "ring-violet-500" },
] as const;

const PHASE2 = new Set(["OTT_CTV", "SOCIAL"]);

const CHANNEL_META: Record<string, { icon: React.ElementType; color: string; description: string; platforms: string; locked?: boolean }> = {
  DISPLAY: { icon: Monitor, color: "text-blue-600 bg-blue-50",    description: "Programmatic banner and display ads via OpenRTB.",              platforms: "Google Display Network, Amazon DSP, open exchanges",                locked: true },
  VIDEO:   { icon: Play,    color: "text-red-600 bg-red-50",      description: "Web video ads via VAST 4.x (pre-roll, mid-roll, post-roll).",  platforms: "YouTube, DailyMotion, Vimeo, publishers with video players" },
  NATIVE:  { icon: Layout,  color: "text-amber-600 bg-amber-50",  description: "In-feed native ads via OpenRTB Native Ad Spec 1.2.",           platforms: "Open exchanges supporting native ad units" },
  AUDIO:   { icon: Music,   color: "text-emerald-600 bg-emerald-50", description: "Programmatic audio ads via DAAST.",                          platforms: "Spotify, Pandora, iHeartRadio, Amazon Music" },
  DOOH:    { icon: MapPin,  color: "text-orange-600 bg-orange-50", description: "Programmatic digital out-of-home via OpenOOH standard.",       platforms: "Clear Channel, Lamar, Outfront, JCDecaux, Vistar Media" },
  OTT_CTV: { icon: Tv2,    color: "text-purple-600 bg-purple-50", description: "Video ads on streaming platforms via VAST 4.x.",               platforms: "Roku, Hulu, Peacock, Amazon Fire TV, Samsung TV+, Netflix, Pluto TV" },
  SOCIAL:  { icon: Share2,  color: "text-pink-600 bg-pink-50",    description: "Social media campaigns via platform-native ad APIs.",          platforms: "Meta, TikTok, LinkedIn, YouTube, Twitter/X, Snapchat" },
};

function getToken() { return localStorage.getItem("dsp_admin_token") ?? ""; }

function Toggle({ enabled, locked, saving, onChange }: {
  enabled: boolean; locked?: boolean; saving: boolean; onChange: (v: boolean) => void;
}) {
  if (saving) return <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />;
  return (
    <button disabled={locked} onClick={() => !locked && onChange(!enabled)}
      aria-label={enabled ? "Disable" : "Enable"}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        enabled ? "bg-blue-600" : "bg-neutral-200"
      } ${locked ? "opacity-60 cursor-not-allowed" : ""}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

export function PlatformAdminSettings() {
  const adminEmail = localStorage.getItem("dsp_admin_email") ?? "—";

  const [configs, setConfigs]         = useState<ChannelConfig[]>([]);
  const [loadingCh, setLoadingCh]     = useState(true);
  const [backendDown, setBackendDown] = useState(false);
  const [saving, setSaving]           = useState<string | null>(null);
  const [toast, setToast]             = useState<{ group: string; ok: boolean; msg: string } | null>(null);
  const [mvpMode, setMvpMode]         = useState(() => localStorage.getItem("dsp_mvp_mode") === "true");
  const [planTierEnabled, setPlanTierEnabled] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(PLAN_TIERS_KEY) ?? "{}"); } catch { return {}; }
  });

  const showToast = (group: string, ok: boolean, msg: string) => {
    setToast({ group, ok, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchConfigs = useCallback(async () => {
    setLoadingCh(true);
    setBackendDown(false);
    try {
      const res = await fetch(`${CHANNEL_API}/api/channels/config`);
      if (res.ok) {
        const data: ChannelConfig[] = await res.json();
        setConfigs(data.length > 0 ? data : DEFAULT_CONFIGS);
      } else {
        setConfigs(DEFAULT_CONFIGS);
        setBackendDown(true);
      }
    } catch {
      setConfigs(DEFAULT_CONFIGS);
      setBackendDown(true);
    } finally { setLoadingCh(false); }
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  async function handleToggleChannel(channelGroup: string, enabled: boolean) {
    setSaving(channelGroup);
    try {
      const action = enabled ? "enable" : "disable";
      const res = await fetch(`${CHANNEL_API}/api/channels/${channelGroup}/${action}`, {
        method: "PUT", headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setConfigs(prev => prev.map(c => c.channelGroup === channelGroup ? { ...c, enabled } : c));
      showToast(channelGroup, true, enabled ? "Channel enabled" : "Channel disabled");
    } catch {
      showToast(channelGroup, false, "Failed to update — check backend connection");
    } finally { setSaving(null); }
  }

  async function handleSetPlan(channelGroup: string, plan: "STARTER" | "GROWTH" | "ENTERPRISE") {
    setSaving(channelGroup + "_plan");
    try {
      const res = await fetch(`${CHANNEL_API}/api/channels/${channelGroup}/plan-requirement`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ requiredPlan: plan }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setConfigs(prev => prev.map(c => c.channelGroup === channelGroup ? { ...c, requiredPlan: plan } : c));
      showToast(channelGroup, true, `Unlocked for ${plan}+`);
    } catch {
      showToast(channelGroup, false, "Update failed — check backend connection");
    } finally { setSaving(null); }
  }

  function toggleMvpMode(val: boolean) {
    setMvpMode(val);
    localStorage.setItem("dsp_mvp_mode", String(val));
  }

  function togglePlanTier(key: string, val: boolean) {
    if (key === "STARTER") return;
    setPlanTierEnabled(prev => {
      const next = { ...prev, [key]: val };
      localStorage.setItem(PLAN_TIERS_KEY, JSON.stringify(next));
      return next;
    });
  }

  const ORDER = ["DISPLAY", "VIDEO", "NATIVE", "AUDIO", "DOOH", "OTT_CTV", "SOCIAL"];
  const sorted = [...configs].sort((a, b) => ORDER.indexOf(a.channelGroup) - ORDER.indexOf(b.channelGroup));

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header + MVP Mode */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Platform Settings</h1>
          <p className="text-neutral-500 text-sm mt-0.5">Configure plan feature access and global channel availability.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-medium text-neutral-500">MVP Mode</span>
          <button onClick={() => toggleMvpMode(!mvpMode)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${mvpMode ? "bg-amber-500" : "bg-neutral-200"}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${mvpMode ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
      </div>

      {mvpMode && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700 flex items-start gap-1.5">
            <Zap className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span><strong>MVP Mode:</strong> Only Display Ads are available to all advertisers. Plan Features are disabled. Turn this off for production to enable full platform features.</span>
          </p>
        </div>
      )}

      {backendDown && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700">
            <strong>Note:</strong> Ad Channel service (port 8090) is unreachable — showing default configuration. Changes will be saved once the service is back online.
          </p>
        </div>
      )}

      {/* Plan Features */}
      {!mvpMode && (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm">
          <div className="p-4 border-b border-neutral-100">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-neutral-400" />
              <h3 className="text-sm font-semibold text-neutral-700">Plan Features</h3>
              <span className="ml-auto text-xs text-neutral-400">Set which channels each plan unlocks</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-neutral-500">Plan Tiers:</span>
              {PLAN_TIERS.filter(t => t.key !== "STARTER").map(tier => {
                const on = planTierEnabled[tier.key] !== false;
                return (
                  <button key={tier.key} onClick={() => togglePlanTier(tier.key, !on)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      on ? `${tier.color} border-transparent` : "border-neutral-200 bg-white text-neutral-400"
                    }`}>
                    <span className={`w-3 h-3 rounded-full border-2 flex-shrink-0 transition-all ${
                      on ? `border-transparent ${tier.dot}` : "border-neutral-300 bg-white"
                    }`}>
                      {on && <div className="w-1.5 h-1.5 rounded-full bg-white mx-auto mt-0.5" />}
                    </span>
                    {tier.label}
                  </button>
                );
              })}
            </div>
          </div>
          {loadingCh ? (
            <div className="flex items-center justify-center py-12 gap-2 text-neutral-400">
              <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading…</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-100">
                    <th className="text-left px-5 py-3 text-xs font-medium text-neutral-500 w-48">Channel</th>
                    {PLAN_TIERS.map(tier => {
                      const isOff = tier.key !== "STARTER" && planTierEnabled[tier.key] === false;
                      return (
                        <th key={tier.key} className={`px-4 py-3 text-center ${isOff ? "opacity-40" : ""}`}>
                          <div className={`inline-flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg border ${
                            isOff ? "border-neutral-200 bg-neutral-100" : tier.color
                          }`}>
                            <span className={`text-xs font-bold ${isOff ? "text-neutral-400" : "text-neutral-800"}`}>{tier.label}</span>
                            <span className={`text-[10px] whitespace-nowrap ${isOff ? "text-neutral-400" : "text-neutral-400"}`}>{tier.desc}</span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {sorted.map((cfg, idx) => {
                    const meta = CHANNEL_META[cfg.channelGroup];
                    const Icon = meta?.icon ?? Settings2;
                    const isLocked = !!meta?.locked;
                    const isPhase2 = PHASE2.has(cfg.channelGroup);
                    const prevIsPhase1 = idx > 0 && !PHASE2.has(sorted[idx - 1].channelGroup);
                    const currentReq = cfg.requiredPlan ?? "STARTER";
                    const isSaving = saving === cfg.channelGroup + "_plan";
                    return (
                      <React.Fragment key={cfg.channelGroup}>
                        {isPhase2 && prevIsPhase1 && (
                          <tr><td colSpan={4} className="px-5 py-2 bg-neutral-50 border-t border-neutral-200">
                            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Phase 2 — Coming Soon</span>
                          </td></tr>
                        )}
                        <tr className={`hover:bg-neutral-50/50 transition-colors ${isPhase2 ? "opacity-60" : ""}`}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-1.5 rounded-md flex-shrink-0 ${meta?.color ?? "text-slate-600 bg-slate-100"}`}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-sm font-medium text-neutral-800">{cfg.displayName}</span>
                              {isLocked && <Lock className="w-3 h-3 text-neutral-300" />}
                              {isPhase2 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-400 border border-neutral-200">Phase 2</span>}
                            </div>
                            {toast?.group === cfg.channelGroup && (
                              <p className={`text-[11px] mt-1 pl-9 font-medium flex items-center gap-1 ${toast.ok ? "text-emerald-600" : "text-red-500"}`}>
                                {toast.ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}{toast.msg}
                              </p>
                            )}
                          </td>
                          {PLAN_TIERS.map(tier => {
                            const isSelected = currentReq === tier.key;
                            const canAccess  = PLAN_ORDER[tier.key] >= PLAN_ORDER[currentReq];
                            const isOff = tier.key !== "STARTER" && planTierEnabled[tier.key] === false;
                            return (
                              <td key={tier.key} className={`px-4 py-3 text-center ${isOff ? "opacity-40" : ""}`}>
                                {isSaving && isSelected
                                  ? <Loader2 className="w-4 h-4 animate-spin text-neutral-400 mx-auto" />
                                  : <button
                                      disabled={isLocked || isSaving || isOff}
                                      onClick={() => !isLocked && !isSaving && !isOff && handleSetPlan(cfg.channelGroup, tier.key as any)}
                                      title={isLocked ? "Always available" : isOff ? "Plan tier disabled" : `Set minimum plan to ${tier.label}`}
                                      className={`w-5 h-5 rounded-full border-2 mx-auto flex items-center justify-center transition-all ${
                                        isSelected ? `border-transparent ${tier.dot}` :
                                        canAccess  ? "border-neutral-200 bg-neutral-100 cursor-default" :
                                                     "border-neutral-200 bg-white hover:border-neutral-400 cursor-pointer"
                                      } ${isLocked ? "opacity-40 cursor-not-allowed" : ""}`}>
                                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                      {!isSelected && canAccess && !isLocked && !isOff && (
                                        <div className={`w-1.5 h-1.5 rounded-full opacity-40 ${tier.dot}`} />
                                      )}
                                    </button>
                                }
                              </td>
                            );
                          })}
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="p-4 border-t border-neutral-100 bg-neutral-50 rounded-b-xl">
            <p className="text-xs text-neutral-500">
              <strong>How it works:</strong> The filled dot marks the <em>minimum plan</em> required. Advertisers on that plan or higher can access the channel. Click a dot to change the minimum. Disable a tier to fall advertisers back to the next lower active tier.
            </p>
          </div>
        </div>
      )}

      {/* Ad Channels */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm">
        <div className="p-4 border-b border-neutral-100 flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-neutral-400" />
          <h3 className="text-sm font-semibold text-neutral-700">Ad Channels</h3>
          <span className="ml-auto text-xs text-neutral-400">{configs.filter(c => c.enabled).length} of {configs.length} active</span>
        </div>
        {loadingCh ? (
          <div className="flex items-center justify-center py-16 gap-2 text-neutral-400">
            <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading channel configuration…</span>
          </div>
        ) : (
          <div className="divide-y divide-neutral-50">
            {sorted.map((cfg, idx) => {
              const meta = CHANNEL_META[cfg.channelGroup];
              const Icon = meta?.icon ?? Settings2;
              const isPhase2 = PHASE2.has(cfg.channelGroup);
              const prevIsPhase1 = idx > 0 && !PHASE2.has(sorted[idx - 1].channelGroup);
              return (
                <React.Fragment key={cfg.channelGroup}>
                  {isPhase2 && prevIsPhase1 && (
                    <div className="px-5 py-2 bg-neutral-50 border-t border-neutral-200">
                      <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Phase 2 — Coming Soon</span>
                    </div>
                  )}
                  <div className={`px-5 py-4 flex items-start gap-4 ${isPhase2 ? "opacity-60" : ""}`}>
                    <div className={`p-2 rounded-lg flex-shrink-0 mt-0.5 ${meta?.color ?? "text-slate-600 bg-slate-100"}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-neutral-900">{cfg.displayName}</p>
                        {meta?.locked && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 uppercase">Always On</span>}
                        {!meta?.locked && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${cfg.enabled ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>
                            {cfg.enabled ? "Live" : "Inactive"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">{meta?.description}</p>
                      <p className="text-xs text-neutral-400 mt-0.5"><span className="font-medium">Platforms:</span> {meta?.platforms}</p>
                      {toast?.group === cfg.channelGroup && (
                        <div className={`flex items-center gap-1.5 mt-2 text-xs font-medium ${toast.ok ? "text-emerald-600" : "text-red-500"}`}>
                          {toast.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}{toast.msg}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 mt-1">
                      <Toggle enabled={cfg.enabled} locked={meta?.locked} saving={saving === cfg.channelGroup} onChange={v => handleToggleChannel(cfg.channelGroup, v)} />
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
        <div className="p-4 border-t border-neutral-100 bg-amber-50 rounded-b-xl">
          <p className="text-xs text-amber-700">
            <strong>Note:</strong> Enabling a channel adds its nav items to the sidebar and unlocks its campaign targeting options immediately — no deployment required. Display is always on.
          </p>
        </div>
      </div>

      {/* Platform Info */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm">
        <div className="p-4 border-b border-neutral-100 flex items-center gap-2">
          <Info className="w-4 h-4 text-neutral-400" />
          <h3 className="text-sm font-semibold text-neutral-700">Platform Info</h3>
        </div>
        <div className="p-5 space-y-0 divide-y divide-neutral-50">
          {[
            { label: "Logged in as",    value: adminEmail },
            { label: "Cognito Group",   value: "ADMIN" },
            { label: "User Pool ID",    value: COGNITO_POOL },
            { label: "Region",          value: COGNITO_REGION },
            { label: "Auth API URL",    value: AUTH_API },
            { label: "Channel API URL", value: CHANNEL_API },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-neutral-500">{label}</span>
              <span className="text-sm text-neutral-800 font-mono bg-neutral-100 px-3 py-1 rounded-lg max-w-xs truncate">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
