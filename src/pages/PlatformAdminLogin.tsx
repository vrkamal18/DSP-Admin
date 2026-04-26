import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Eye, EyeOff, Loader2, ArrowLeft, KeyRound } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

type View = "login" | "forgot-email" | "forgot-code" | "forgot-success";

function parseJwtClaims(token: string): Record<string, any> {
  try { return JSON.parse(atob(token.split(".")[1])); } catch { return {}; }
}

export function PlatformAdminLogin() {
  const navigate = useNavigate();

  const [view, setView]             = useState<View>("login");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword]   = useState("");
  const [resetCode, setResetCode]       = useState("");
  const [resetEmail, setResetEmail]     = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [errorMsg, setErrorMsg]         = useState<string | null>(null);
  const [infoMsg, setInfoMsg]           = useState<string | null>(null);
  const [requireNewPassword, setRequireNewPassword] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const { signIn, signOut } = await import("@aws-amplify/auth");

      // Clear any existing Amplify session before signing in
      try { await signOut(); } catch (_) {}

      const result = await signIn({ username: email, password });

      if (!result.isSignedIn && result.nextStep?.signInStep === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED") {
        setRequireNewPassword(true);
        setSubmitting(false);
        return;
      }

      if (result.isSignedIn) {
        await verifyAdminAndRedirect();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const { confirmSignIn } = await import("@aws-amplify/auth");
      const result = await confirmSignIn({ challengeResponse: newPassword });
      if (result.isSignedIn) {
        await verifyAdminAndRedirect();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Password change failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyAdminAndRedirect() {
    const { fetchAuthSession, signOut } = await import("@aws-amplify/auth");
    // forceRefresh ensures we get fresh tokens with updated group claims
    const session = await fetchAuthSession({ forceRefresh: true });
    const idToken = session.tokens?.idToken?.toString() ?? "";
    const claims  = parseJwtClaims(idToken);
    const groups: string[] = Array.isArray(claims["cognito:groups"]) ? claims["cognito:groups"] : [];
    const lowerGroups = groups.map((g: string) => g.toLowerCase());

    if (!lowerGroups.includes("admin")) {
      await signOut();
      setErrorMsg("Access denied. You are not a Platform Admin.");
      return;
    }

    const token = session.tokens?.accessToken?.toString() ?? "";
    localStorage.setItem("dsp_admin_token", token);
    localStorage.setItem("dsp_admin_id_token", idToken);
    localStorage.setItem("dsp_admin_email", email);
    navigate("/");
  }

  async function handleForgotPasswordSend(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const { resetPassword } = await import("@aws-amplify/auth");
      await resetPassword({ username: resetEmail });
      setInfoMsg("Reset code sent to your email.");
      setView("forgot-code");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to send reset code");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotPasswordConfirm(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const { confirmResetPassword } = await import("@aws-amplify/auth");
      await confirmResetPassword({ username: resetEmail, confirmationCode: resetCode, newPassword });
      setView("forgot-success");
      setInfoMsg("Password reset successfully! You can now log in.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-8">

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-indigo-600 p-2.5 rounded-xl">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">DSP Platform</h1>
              <p className="text-sm text-gray-400">Platform Administration</p>
            </div>
          </div>

          {/* ── LOGIN VIEW ── */}
          {view === "login" && (
            <>
              <h2 className="text-2xl font-semibold text-white mb-1">
                {requireNewPassword ? "Set New Password" : "Admin Sign In"}
              </h2>
              <p className="text-gray-400 text-sm mb-6">
                {requireNewPassword
                  ? "You must set a new password before continuing"
                  : "Restricted to Platform Administrators only"}
              </p>

              <form onSubmit={requireNewPassword ? handleConfirmNewPassword : handleLogin} className="space-y-4">
                {!requireNewPassword && (
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-gray-300">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-gray-800 border-gray-600 text-white placeholder-gray-500 focus:border-indigo-500"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-gray-300">
                    {requireNewPassword ? "New Password" : "Password"}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={requireNewPassword ? "Enter new password" : "Enter your password"}
                      value={requireNewPassword ? newPassword : password}
                      onChange={(e) => requireNewPassword ? setNewPassword(e.target.value) : setPassword(e.target.value)}
                      required
                      className="bg-gray-800 border-gray-600 text-white placeholder-gray-500 focus:border-indigo-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <div className="text-sm text-red-400 bg-red-950 border border-red-800 rounded-lg px-3 py-2">
                    {errorMsg}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-10 mt-2 bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {submitting
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {requireNewPassword ? "Updating..." : "Signing in..."}</>
                    : requireNewPassword ? "Set Password & Sign In" : "Sign In"
                  }
                </Button>
              </form>

              {!requireNewPassword && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => { setView("forgot-email"); setErrorMsg(null); }}
                    className="text-sm text-indigo-400 hover:text-indigo-300 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── FORGOT PASSWORD - STEP 1: Email ── */}
          {view === "forgot-email" && (
            <>
              <button
                onClick={() => { setView("login"); setErrorMsg(null); setInfoMsg(null); }}
                className="flex items-center gap-1 text-gray-400 hover:text-gray-200 text-sm mb-6"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Sign In
              </button>
              <h2 className="text-2xl font-semibold text-white mb-1">Reset Password</h2>
              <p className="text-gray-400 text-sm mb-6">Enter your admin email to receive a reset code.</p>

              <form onSubmit={handleForgotPasswordSend} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="resetEmail" className="text-gray-300">Admin Email</Label>
                  <Input
                    id="resetEmail"
                    type="email"
                    placeholder="admin@company.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className="bg-gray-800 border-gray-600 text-white placeholder-gray-500 focus:border-indigo-500"
                  />
                </div>
                {errorMsg && (
                  <div className="text-sm text-red-400 bg-red-950 border border-red-800 rounded-lg px-3 py-2">{errorMsg}</div>
                )}
                <Button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white">
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</> : "Send Reset Code"}
                </Button>
              </form>
            </>
          )}

          {/* ── FORGOT PASSWORD - STEP 2: Code + New Password ── */}
          {view === "forgot-code" && (
            <>
              <button
                onClick={() => { setView("forgot-email"); setErrorMsg(null); }}
                className="flex items-center gap-1 text-gray-400 hover:text-gray-200 text-sm mb-6"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h2 className="text-2xl font-semibold text-white mb-1">Enter Reset Code</h2>
              <p className="text-gray-400 text-sm mb-6">
                {infoMsg ?? "Check your email for the 6-digit reset code."}
              </p>

              <form onSubmit={handleForgotPasswordConfirm} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="resetCode" className="text-gray-300">Reset Code</Label>
                  <Input
                    id="resetCode"
                    placeholder="Enter 6-digit code"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    required
                    className="bg-gray-800 border-gray-600 text-white placeholder-gray-500 focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="newPwd" className="text-gray-300">New Password</Label>
                  <Input
                    id="newPwd"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="bg-gray-800 border-gray-600 text-white placeholder-gray-500 focus:border-indigo-500"
                  />
                </div>
                {errorMsg && (
                  <div className="text-sm text-red-400 bg-red-950 border border-red-800 rounded-lg px-3 py-2">{errorMsg}</div>
                )}
                <Button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white">
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Resetting...</> : "Reset Password"}
                </Button>
              </form>
            </>
          )}

          {/* ── FORGOT PASSWORD - SUCCESS ── */}
          {view === "forgot-success" && (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-indigo-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-7 h-7 text-indigo-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Password Reset!</h2>
              <p className="text-gray-400 text-sm mb-6">{infoMsg}</p>
              <Button
                onClick={() => { setView("login"); setErrorMsg(null); setInfoMsg(null); setNewPassword(""); setResetCode(""); }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Back to Sign In
              </Button>
            </div>
          )}

          <p className="text-xs text-gray-600 text-center mt-6">DSP Platform Admin Portal v1.0</p>
        </div>
      </div>
    </div>
  );
}
