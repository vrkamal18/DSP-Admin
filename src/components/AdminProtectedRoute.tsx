import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Shield } from "lucide-react";

function parseJwtClaims(token: string): Record<string, any> {
  try { return JSON.parse(atob(token.split(".")[1])); } catch { return {}; }
}

export function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("dsp_admin_token");
      const idToken = localStorage.getItem("dsp_admin_id_token");
      const email = localStorage.getItem("dsp_admin_email");

      if (!token || !email) {
        setIsLoading(false);
        return;
      }

      const claims = parseJwtClaims(idToken ?? token);
      const groups: string[] = Array.isArray(claims["cognito:groups"]) ? claims["cognito:groups"] : [];
      const lowerGroups = groups.map((g: string) => g.toLowerCase());
      const exp: number = claims["exp"] ?? 0;

      const isAdmin = lowerGroups.includes("admin") && Date.now() / 1000 <= exp;
      setIsAuthenticated(isAdmin);
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-indigo-600 mx-auto mb-4 animate-pulse" />
          <p className="text-neutral-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
