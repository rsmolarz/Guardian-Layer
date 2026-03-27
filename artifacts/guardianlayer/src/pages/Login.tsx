import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Shield, Lock, User, AlertTriangle, Eye, EyeOff, Key, Loader2, Fingerprint } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import { API_BASE } from "@/lib/constants";

export default function Login() {
  const { login, loginWithToken } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [webauthnLoading, setWebauthnLoading] = useState(false);
  const [didLoading, setDidLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const didCode = params.get("did_code");
    const didError = params.get("did_error");

    if (didCode) {
      const url = new URL(window.location.href);
      url.searchParams.delete("did_code");
      window.history.replaceState({}, "", url.pathname);

      setDidLoading(true);
      fetch(`${API_BASE}/api/auth/did/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: didCode }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.token) {
            const parts = data.token.split(".");
            if (parts.length === 3) {
              const raw = parts[1].replace(/-/g, "+").replace(/_/g, "/");
              const payload = JSON.parse(atob(raw));
              loginWithToken(data.token, {
                id: payload.userId,
                username: payload.username,
                role: payload.role,
                email: "",
              });
            } else {
              setError("Invalid token received from DID login");
            }
          } else {
            setError(data.error || "Failed to complete DID login");
          }
        })
        .catch(() => setError("Failed to exchange DID login code"))
        .finally(() => setDidLoading(false));
    }

    if (didError) {
      const url = new URL(window.location.href);
      url.searchParams.delete("did_error");
      window.history.replaceState({}, "", url.pathname);

      const errorMessages: Record<string, string> = {
        missing_code_or_state: "DID login was incomplete. Please try again.",
        invalid_or_expired_state: "DID login session expired. Please try again.",
        token_exchange_failed: "Failed to verify DID credentials. Please try again.",
        no_access_token: "DID service did not provide an access token.",
        userinfo_failed: "Could not retrieve your DID profile.",
        account_disabled: "Your account has been disabled. Contact an administrator.",
        internal_error: "An internal error occurred during DID login.",
      };
      setError(errorMessages[didError] || `DID login failed: ${didError}`);
    }
  }, [loginWithToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(username, password);
    if (!result.success) {
      setError(result.error || "Login failed");
    }
    setLoading(false);
  };

  const handleWebAuthn = async () => {
    if (!username) {
      setError("Enter your username first, then tap the YubiKey button");
      return;
    }
    setError("");
    setWebauthnLoading(true);
    try {
      const optionsRes = await fetch(`${API_BASE}/api/auth/webauthn/login/options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const optionsData = await optionsRes.json();

      if (!optionsData.hasKeys) {
        setError("No security keys registered for this account. Log in with your password first, then register a key in Security Keys settings.");
        setWebauthnLoading(false);
        return;
      }

      const authResponse = await startAuthentication({ optionsJSON: optionsData.options });

      const verifyRes = await fetch(`${API_BASE}/api/auth/webauthn/login/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, credential: authResponse }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        setError(verifyData.error || "YubiKey authentication failed");
        setWebauthnLoading(false);
        return;
      }

      loginWithToken(verifyData.token, verifyData.user);
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setError("Security key authentication was cancelled");
      } else {
        setError(err.message || "YubiKey authentication failed");
      }
    }
    setWebauthnLoading(false);
  };

  const handleDIDLogin = () => {
    window.location.href = `${API_BASE}/api/auth/did/initiate`;
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-gray-950 to-gray-950" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(6,182,212,0.1) 50px, rgba(6,182,212,0.1) 51px),
                            repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(6,182,212,0.1) 50px, rgba(6,182,212,0.1) 51px)`
        }} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 mb-4 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
            <Shield className="w-10 h-10 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">GuardianLayer</h1>
          <p className="text-gray-400 mt-1 text-sm">Enterprise Security Platform</p>
        </div>

        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-8 backdrop-blur-sm shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">Secure Access</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {didLoading && (
            <div className="mb-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center gap-2 text-purple-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Completing DID login...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email or Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                  placeholder="Enter email or username"
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-10 pr-10 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium py-2.5 rounded-lg transition-all duration-200 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] disabled:shadow-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-4 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-gray-900/80 px-3 text-gray-500">or</span>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={handleDIDLogin}
              disabled={didLoading}
              className="w-full bg-purple-600/20 hover:bg-purple-600/30 disabled:bg-gray-800 disabled:text-gray-600 text-purple-400 font-medium py-2.5 rounded-lg transition-all duration-200 border border-purple-600/30 hover:border-purple-500/50 disabled:border-gray-700 flex items-center justify-center gap-2"
            >
              <Fingerprint className="w-4 h-4" />
              Sign In with DID
            </button>

            <button
              type="button"
              onClick={handleWebAuthn}
              disabled={webauthnLoading || !username}
              className="w-full bg-amber-600/20 hover:bg-amber-600/30 disabled:bg-gray-800 disabled:text-gray-600 text-amber-400 font-medium py-2.5 rounded-lg transition-all duration-200 border border-amber-600/30 hover:border-amber-500/50 disabled:border-gray-700 flex items-center justify-center gap-2"
            >
              {webauthnLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Tap your YubiKey...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  Sign In with YubiKey
                </>
              )}
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-500 text-center">
              Protected by FIDO2/WebAuthn hardware key authentication, DID identity verification, and AES-256 encryption
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          GuardianLayer Enterprise v2.0 — All sessions monitored
        </p>
      </div>
    </div>
  );
}
