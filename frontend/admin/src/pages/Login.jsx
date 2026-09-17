import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Radio, Lock, User as UserIcon, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const REMEMBER_KEY = "remembered_username";

export default function Login() {
  const [username, setUsername] = useState(
    () => localStorage.getItem(REMEMBER_KEY) || ""
  );
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(
    () => !!localStorage.getItem(REMEMBER_KEY)
  );
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(username, password);
      if (user.role === "agent") {
        setError("Agents must use the mobile app");
        return;
      }
      if (remember) {
        localStorage.setItem(REMEMBER_KEY, username);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
    } catch (e) {
      setError(e.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const taglineWords = ["Monitor.", "Respond.", "Stay informed."];

  return (
    <div className="login-page-v2">
      <div className="login-branding">
        <motion.div
          className="login-brand-mark"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Radio size={22} />
        </motion.div>
        <motion.div
          className="login-brand-title"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          SITUATION ROOM
        </motion.div>
        <motion.div
          className="login-brand-subtitle"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.18 }}
        >
          Bauchi State
          <br />
          Polling Unit Monitoring
        </motion.div>

        <div className="login-tagline">
          {taglineWords.map((word, i) => (
            <motion.span
              key={word}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.4 + i * 0.15 }}
            >
              {word}
            </motion.span>
          ))}
        </div>
      </div>

      {/* Sign-in panel */}
      <div className="login-form-panel">
        <motion.div
          className="login-form-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="login-welcome">Welcome back</div>
          <div className="login-welcome-subtitle">Sign in to continue</div>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="label">Username</label>
              <div className="input-icon-wrap">
                <UserIcon size={15} className="input-icon" />
                <input
                  className="input"
                  style={{ paddingLeft: "2.25rem" }}
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="label">Password</label>
              <div className="input-icon-wrap">
                <Lock size={15} className="input-icon" />
                <input
                  className="input"
                  style={{ paddingLeft: "2.25rem", paddingRight: "2.25rem" }}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  className="input-icon-trailing"
                  onClick={() => setShowPassword((s) => !s)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <label className="login-remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Remember me
            </label>

            {error && (
              <div
                className="badge badge-red mb-3 mt-3"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  padding: "0.6rem",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full mt-3"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
