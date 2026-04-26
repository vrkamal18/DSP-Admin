import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Shield, Users, Building2, Settings, LayoutDashboard, LogOut, CreditCard, Database } from "lucide-react";
import { Button } from "../components/ui/button";
import { useEffect, useState } from "react";

function parseJwtClaims(token: string): Record<string, any> {
  try { return JSON.parse(atob(token.split(".")[1])); } catch { return {}; }
}

export function PlatformAdminLayout() {
  const navigate    = useNavigate();
  const [adminEmail, setAdminEmail] = useState("");

  useEffect(() => {
    const email = localStorage.getItem("dsp_admin_email");
    if (email) {
      setAdminEmail(email);
    }
  }, []);

  async function handleLogout() {
    localStorage.removeItem("dsp_admin_token");
    localStorage.removeItem("dsp_admin_id_token");
    localStorage.removeItem("dsp_admin_email");
    try {
      const { signOut } = await import("@aws-amplify/auth");
      await signOut();
    } catch (_) {}
    navigate("/platform-admin/login");
  }

  const navItems = [
    { to: "/platform-admin",          icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/platform-admin/users",    icon: Users,           label: "Users" },
    { to: "/platform-admin/tenants",  icon: Building2,       label: "Tenants" },
    { to: "/platform-admin/fees",     icon: CreditCard,      label: "Fees" },
    { to: "/platform-admin/dmp-connectors", icon: Database,  label: "Connectors" },
    { to: "/platform-admin/settings", icon: Settings,        label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-neutral-900">DSP Platform Admin</h1>
            <p className="text-xs text-neutral-500">{adminEmail}</p>
          </div>
        </div>
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="text-neutral-500 hover:text-red-600 hover:bg-red-50 gap-2 text-sm"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-neutral-200 p-4 flex flex-col gap-1 shadow-sm">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </aside>

        {/* Page content */}
        <main className="flex-1 p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
