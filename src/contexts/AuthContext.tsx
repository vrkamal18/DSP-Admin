import { createContext, useContext, useEffect, useState, ReactNode } from "react";

const TOKEN_KEY = "dsp_access_token";
const USER_KEY  = "dsp_username";

const cognitoPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID ?? "";
const USE_LOCAL_AUTH =
  import.meta.env.VITE_AUTH_MODE === "local" ||
  !cognitoPoolId ||
  cognitoPoolId.startsWith("us-east-1_XXXX");
const LOCAL_AUTH_API = import.meta.env.VITE_AUTH_API_URL ?? "http://localhost:8088";

interface AuthUser {
  username: string;
  email?: string;
  accessToken: string;
  advertiserId: number;
  roles: string[];
  tenantId: number | null;
  subTenantId: number | null;
  plan: string;
}

function parseJwtClaims(token: string): Record<string, any> {
  try { return JSON.parse(atob(token.split(".")[1])); } catch { return {}; }
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  isNavigating: boolean;
  isLocalAuth: boolean;
  login: (username: string, password: string, newPassword?: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (username: string) => Promise<void>;
  resetPassword: (username: string, code: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/* ── Local auth helpers ───────────────────────────────────────────────────── */

async function exchangeForLocalToken(cognitoToken: string, email: string): Promise<string> {
  try {
    const res = await fetch(`${LOCAL_AUTH_API}/auth/token-exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cognitoToken, email }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.token as string;
    }
  } catch {
    // fallback: use Cognito token as-is if exchange fails
  }
  return cognitoToken;
}

async function localLogin(username: string, password: string): Promise<string> {
  const res = await fetch(`${LOCAL_AUTH_API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? "Invalid username or password");
  }
  const data = await res.json();
  return data.token as string;
}

/* ── Provider ─────────────────────────────────────────────────────────────── */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    const handleAuthExpired = () => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setUser(null);
    };
    window.addEventListener("dsp:auth-expired", handleAuthExpired);
    return () => window.removeEventListener("dsp:auth-expired", handleAuthExpired);
  }, []);

  useEffect(() => {
    if (USE_LOCAL_AUTH) {
      const token    = localStorage.getItem(TOKEN_KEY);
      const username = localStorage.getItem(USER_KEY);
      if (token && username) {
        const claims = parseJwtClaims(token);
        const roles = Array.isArray(claims.roles) ? claims.roles : [];
        setUser({
          username,
          accessToken: token,
          advertiserId: claims.advertiserId ?? 0,
          roles,
          tenantId:    claims.tenantId    ?? null,
          subTenantId: claims.subTenantId ?? null,
          plan:        claims.plan        ?? "STARTER",
        });
      }
      setLoading(false);
    } else {
      import("@aws-amplify/auth").then(({ getCurrentUser, fetchAuthSession }) =>
        getCurrentUser().then(async (cognito) => {
          const session = await fetchAuthSession();
          const cognitoToken = session.tokens?.accessToken?.toString() ?? "";
          const { fetchUserAttributes } = await import("@aws-amplify/auth");
          const attrs   = await fetchUserAttributes().catch(() => ({}));
          const userEmail = (attrs as any)["email"] ?? localStorage.getItem(USER_KEY) ?? "";
          const localToken = await exchangeForLocalToken(cognitoToken, userEmail);
          localStorage.setItem(TOKEN_KEY, localToken);
          const advertiserId = parseInt((attrs as any)["custom:advertiserId"] ?? "1");
          const idToken = session.tokens?.idToken?.toString() ?? "";
          const idClaims = parseJwtClaims(idToken);
          const localClaims = parseJwtClaims(localToken);
          const cognitoGroups: string[] = Array.isArray(idClaims["cognito:groups"]) ? idClaims["cognito:groups"] : [];
          const roles: string[] = Array.isArray(localClaims.roles) && localClaims.roles.length > 0
            ? localClaims.roles
            : cognitoGroups;
          setUser((prevUser) => {
            const userData = {
              username: userEmail || cognito.username,
              email: userEmail,
              accessToken: localToken,
              advertiserId: localClaims.advertiserId ?? advertiserId,
              roles,
              tenantId:    localClaims.tenantId    ?? null,
              subTenantId: localClaims.subTenantId ?? null,
              plan:        localClaims.plan        ?? "STARTER",
            };
            return userData;
          });
        }).catch((error) => {
        console.log("Initial auth check failed, trying local token fallback:", error);
        // Fall back to stored local token so a page refresh doesn't log the user out
        const storedToken    = localStorage.getItem(TOKEN_KEY);
        const storedUsername = localStorage.getItem(USER_KEY);
        if (storedToken && storedUsername) {
          const claims = parseJwtClaims(storedToken);
          const notExpired = !claims.exp || claims.exp * 1000 > Date.now();
          if (notExpired) {
            setUser({
              username:    storedUsername,
              email:       storedUsername,
              accessToken: storedToken,
              advertiserId: claims.advertiserId ?? 0,
              roles:       Array.isArray(claims.roles) ? claims.roles : [],
              tenantId:    claims.tenantId    ?? null,
              subTenantId: claims.subTenantId ?? null,
              plan:        claims.plan        ?? "STARTER",
            });
            return;
          }
        }
        if (!isNavigating) {
          setUser(null);
        }
      }).finally(() => setLoading(false))
      );
    }
  }, []);

  async function login(username: string, password: string, newPassword?: string) {
    setError(null);
    setIsNavigating(true);
    
    // Clear any existing Amplify session first
    if (!USE_LOCAL_AUTH) {
      try {
        const { signOut } = await import("@aws-amplify/auth");
        await signOut();
      } catch (e) {
        // Ignore sign-out errors (might not be signed in)
      }
    }
    
    if (USE_LOCAL_AUTH) {
      const token = await localLogin(username, password);
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, username);
      const claims = parseJwtClaims(token);
      const roles = Array.isArray(claims.roles) ? claims.roles : [];
      setUser({
        username,
        accessToken: token,
        advertiserId: claims.advertiserId ?? 0,
        roles,
        tenantId:    claims.tenantId    ?? null,
        subTenantId: claims.subTenantId ?? null,
        plan:        claims.plan        ?? "STARTER",
      });
    } else {
      const { signIn } = await import("@aws-amplify/auth");
      const result = await signIn({ username, password });
      console.log("Sign-in result:", result);
      console.log("isSignedIn:", result.isSignedIn);
      console.log("nextStep:", result.nextStep);
      
      if (result.isSignedIn) {
        // Login complete
      } else if (result.nextStep) {
        if (newPassword && result.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
          // Handle password change
          const { confirmSignIn } = await import("@aws-amplify/auth");
          const confirmResult = await confirmSignIn({ challengeResponse: newPassword });
          if (confirmResult.isSignedIn) {
            // Password change successful, continue with normal flow
            result.isSignedIn = true;
            result.nextStep = undefined;
          } else {
            throw new Error("Password change failed");
          }
        } else {
          throw new Error(`Additional step required: ${result.nextStep.signInStep}`);
        }
      } else {
        throw new Error("Sign-in failed");
      }
      
      if (result.isSignedIn) {
        const { getCurrentUser, fetchAuthSession } = await import("@aws-amplify/auth");
        const cognito = await getCurrentUser();
        const session = await fetchAuthSession();
        console.log("Cognito session:", session);
        console.log("Session tokens:", session.tokens);
        console.log("Access token:", session.tokens?.accessToken);
        const cognitoAccessToken = session.tokens?.accessToken?.toString() ?? "";
        localStorage.setItem(USER_KEY, username);
        const { fetchUserAttributes } = await import("@aws-amplify/auth");
        const attrs  = await fetchUserAttributes().catch(() => ({}));
        const userEmail2 = (attrs as any)["email"] ?? username;
        const localToken = await exchangeForLocalToken(cognitoAccessToken, userEmail2);
        localStorage.setItem(TOKEN_KEY, localToken);
        const advertiserId = parseInt((attrs as any)["custom:advertiserId"] ?? "1");
        const idToken2 = session.tokens?.idToken?.toString() ?? "";
        const idClaims2 = parseJwtClaims(idToken2);
        const localClaims2 = parseJwtClaims(localToken);
        const cognitoGroups2: string[] = Array.isArray(idClaims2["cognito:groups"]) ? idClaims2["cognito:groups"] : [];
        const roles2: string[] = Array.isArray(localClaims2.roles) && localClaims2.roles.length > 0
          ? localClaims2.roles
          : cognitoGroups2;
        setUser((prevUser) => {
          const userData = {
            username: userEmail2 || cognito.username,
            email: userEmail2,
            accessToken: localToken,
            advertiserId: localClaims2.advertiserId ?? advertiserId,
            roles: roles2,
            tenantId:    localClaims2.tenantId    ?? null,
            subTenantId: localClaims2.subTenantId ?? null,
            plan:        localClaims2.plan        ?? "STARTER",
          };
          return userData;
        });
      }
    }
    setIsNavigating(false);
  }

  async function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    if (!USE_LOCAL_AUTH) {
      try {
        const { signOut } = await import("@aws-amplify/auth");
        await signOut();
      } catch (e) {
        // Ignore sign-out errors
      }
    }
    setUser(null);
  }

  async function forgotPassword(username: string) {
    if (USE_LOCAL_AUTH) {
      throw new Error("Password reset not available for local auth");
    }
    const { resetPassword } = await import("@aws-amplify/auth");
    await resetPassword({ username });
  }

  async function resetPassword(username: string, code: string, newPassword: string) {
    if (USE_LOCAL_AUTH) {
      throw new Error("Password reset not available for local auth");
    }
    const { confirmResetPassword } = await import("@aws-amplify/auth");
    await confirmResetPassword({ username, confirmationCode: code, newPassword });
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, isNavigating, isLocalAuth: USE_LOCAL_AUTH, login, logout, forgotPassword, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
