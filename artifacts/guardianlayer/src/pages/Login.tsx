import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Shield, Lock, User, AlertTriangle, Eye, EyeOff, Key, Loader2, Fingerprint } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import { API_BASE } from "@/lib/constants";
import { isFirebaseConfigured } from "@/lib/firebase-config";

type FirebaseProvider = "google" | "github" | "facebook" | "apple";

async function loadFirebaseAuth() {
  const mod = await import("@/lib/firebase");
  return mod;
}

export default function Login() {
  const { login, loginWithToken } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [webauthnLoading, setWebauthnLoading] = useState(false);
  const [didLoading, setDidLoading] = useState(false);
  const [firebaseLoading, setFirebaseLoading] = useState<FirebaseProvider | null>(null);

  const firebaseEnabled = isFirebaseConfigured();

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

  const handleFirebaseLogin = async (provider: FirebaseProvider) => {
    setError("");
    setFirebaseLoading(provider);
    try {
      const firebase = await loadFirebaseAuth();
      const signInFns: Record<FirebaseProvider, () => Promise<any>> = {
        google: firebase.signInWithGoogle,
        github: firebase.signInWithGitHub,
        facebook: firebase.signInWithFacebook,
        apple: firebase.signInWithApple,
      };

      await signInFns[provider]();
      const idToken = await firebase.getIdToken();

      if (!idToken) {
        setError("Failed to get authentication token. Please try again.");
        await firebase.firebaseSignOut();
        setFirebaseLoading(null);
        return;
      }

      const res = await fetch(`${API_BASE}/api/auth/firebase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed");
        await firebase.firebaseSignOut();
        setFirebaseLoading(null);
        return;
      }

      loginWithToken(data.token, data.user);
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
        setFirebaseLoading(null);
        return;
      }
      if (err.code === "auth/account-exists-with-different-credential") {
        setError("An account already exists with this email using a different sign-in method.");
      } else if (err.code === "auth/popup-blocked") {
        setError("Sign-in popup was blocked. Please allow popups for this site.");
      } else {
        setError(err.message || "Authentication failed. Please try again.");
      }
      try { const fb = await loadFirebaseAuth(); await fb.firebaseSignOut(); } catch {}
    }
    setFirebaseLoading(null);
  };

  const socialProviders: { key: FirebaseProvider; label: string; icon: React.ReactNode; colors: string }[] = [
    {
      key: "google",
      label: "Google",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      ),
      colors: "bg-white/10 hover:bg-white/15 text-white border-white/20 hover:border-white/40",
    },
    {
      key: "github",
      label: "GitHub",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      ),
      colors: "bg-gray-700/40 hover:bg-gray-700/60 text-white border-gray-600/40 hover:border-gray-500/60",
    },
    {
      key: "facebook",
      label: "Facebook",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
        </svg>
      ),
      colors: "bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border-blue-600/30 hover:border-blue-500/50",
    },
    {
      key: "apple",
      label: "Apple",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
        </svg>
      ),
      colors: "bg-gray-200/10 hover:bg-gray-200/20 text-white border-gray-400/20 hover:border-gray-300/40",
    },
  ];

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

          {firebaseEnabled && (
            <>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {socialProviders.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => handleFirebaseLogin(p.key)}
                    disabled={firebaseLoading !== null}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${p.colors}`}
                  >
                    {firebaseLoading === p.key ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      p.icon
                    )}
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>

              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-800" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-gray-900/80 px-3 text-gray-500">or sign in with credentials</span>
                </div>
              </div>
            </>
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
                  autoFocus={!firebaseEnabled}
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
