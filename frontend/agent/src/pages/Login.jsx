import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { User, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const { login } = useAuth();

  const checkCapsLock = (e) => {
    if (typeof e.getModifierState === "function") {
      setCapsLockOn(e.getModifierState("CapsLock"));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch (e) {
      setError(e.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-bg flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="animate-fade-slide-up mb-8 flex flex-col items-center text-center">
          <div className="glass-bubble mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
            <ShieldCheck size={30} color="#fff" strokeWidth={2} />
          </div>
          <div className="text-2xl font-bold text-white">PU Agent</div>
          <div className="text-sm text-white/70">Bauchi State Registration</div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass-panel animate-fade-slide-up rounded-3xl p-6"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/80">
              Username
            </label>
            <div className="flex items-center gap-2 rounded-2xl border border-white/30 bg-white/15 px-4 py-3 focus-within:border-white/70">
              <User size={18} color="rgba(255,255,255,0.7)" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                className="w-full bg-transparent text-white placeholder-white/50 outline-none"
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/80">
              Password
            </label>
            <div className="flex items-center gap-2 rounded-2xl border border-white/30 bg-white/15 px-4 py-3 focus-within:border-white/70">
              <Lock size={18} color="rgba(255,255,255,0.7)" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={checkCapsLock}
                onKeyDown={checkCapsLock}
                placeholder="Enter password"
                required
                className="w-full bg-transparent text-white placeholder-white/50 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="tap-scale shrink-0"
              >
                {showPassword ? (
                  <EyeOff size={18} color="rgba(255,255,255,0.7)" />
                ) : (
                  <Eye size={18} color="rgba(255,255,255,0.7)" />
                )}
              </button>
            </div>
            {capsLockOn && (
              <div className="mt-1.5 flex items-center gap-1 text-xs font-medium text-yellow-200">
                <span>⚠</span> Caps Lock is on
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-300/40 bg-red-500/20 px-3 py-2 text-center text-sm font-medium text-white">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="tap-scale w-full rounded-2xl bg-white py-3.5 font-bold text-[#124a1f] shadow-lg disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-white/60">
          Secure authentication &middot; Assigned agents only
        </div>
      </div>
    </div>
  );
}
