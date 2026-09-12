import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  UserPlus,
  MessageSquareWarning,
  RefreshCw,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useNetwork } from "../hooks/useNetwork";
import {
  getPendingCount,
  getConflictCount,
  getPendingComplaintCount,
} from "../services/db";
import { syncPendingRecords, syncPendingComplaints } from "../services/sync";

const CACHE_KEY = "cached_agent_dashboard";

function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function ProfileMenu({ user, logout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="agent-profile" ref={ref}>
      <button
        className="agent-profile-trigger"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="agent-avatar">{initials(user?.full_name)}</span>
        <span className="agent-profile-name">
          {user?.full_name?.split(" ")[0]}
        </span>
        <ChevronDown size={13} style={{ opacity: 0.7 }} />
      </button>
      {open && (
        <motion.div
          className="agent-profile-menu"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="agent-profile-menu-name">{user?.full_name}</div>
          <div className="agent-profile-menu-role">Polling Unit Agent</div>
          <button className="agent-profile-menu-item" onClick={logout}>
            <LogOut size={14} /> Logout
          </button>
        </motion.div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user, logout, api } = useAuth();
  const isOnline = useNetwork();
  const navigate = useNavigate();

  const [server, setServer] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [localPending, setLocalPending] = useState(0);
  const [localConflicts, setLocalConflicts] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [localPendingComplaints, setLocalPendingComplaints] = useState(0);
  const [displayCompletion, setDisplayCompletion] = useState(0);

  const loadLocalCounts = useCallback(async () => {
    const [pending, conflicts, pendingComplaints] = await Promise.all([
      getPendingCount(),
      getConflictCount(),
      getPendingComplaintCount(),
    ]);
    setLocalPending(pending);
    setLocalConflicts(conflicts);
    setLocalPendingComplaints(pendingComplaints);
  }, []);

  const loadServerStats = useCallback(async () => {
    try {
      const res = await api.get("/agent/dashboard");
      setServer(res.data);
      setLoadError(false);
      localStorage.setItem(CACHE_KEY, JSON.stringify(res.data));
    } catch (e) {
      if (!server) setLoadError(true);
    }
  }, [api, server]);

  useEffect(() => {
    loadLocalCounts();
  }, [loadLocalCounts]);

  useEffect(() => {
    const interval = setInterval(loadLocalCounts, 8000);
    return () => clearInterval(interval);
  }, [loadLocalCounts]);

  useEffect(() => {
    if (isOnline) loadServerStats();
  }, [isOnline]);

  const handleSync = async () => {
    if (!isOnline || syncing) return;
    setSyncing(true);
    await Promise.all([syncPendingRecords(), syncPendingComplaints()]);
    await Promise.all([loadLocalCounts(), loadServerStats()]);
    setSyncing(false);
  };

  const assignment = user?.assignment;
  const target = server?.progress?.target ?? 10;
  const serverRegistered = server?.progress?.registered ?? 0;
  const registered = serverRegistered + localPending;
  const completion = target > 0 ? Math.round((registered / target) * 100) : 0;
  const synced = server?.sync?.synced ?? 0;
  const conflicts = server ? server.sync.conflicts : localConflicts;

  useEffect(() => {
    const start = displayCompletion;
    const end = completion;
    if (start === end) return;
    const duration = 700;
    const startTime = performance.now();
    let frame;
    const tick = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayCompletion(Math.round(start + (end - start) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [completion]);

  return (
    <div>
      <div className="agent-header">
        <div>
          <div className="agent-header-label">My Polling Unit</div>
          <div className="agent-header-pu">
            {assignment?.polling_unit_name || "Not Assigned"}
          </div>
          <div className="agent-header-location">
            {assignment?.ward_name || "—"} • {assignment?.lga_name || "—"}
          </div>
        </div>
        <ProfileMenu user={user} logout={logout} />
      </div>

      <div className="container">
        {loadError && (
          <div
            className="badge badge-yellow mb-3"
            style={{ width: "100%", justifyContent: "center" }}
          >
            Couldn't reach the server — showing offline-only numbers until
            you're back online.
          </div>
        )}

        <motion.div
          className="card hero-progress"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        >
          <div
            className="hero-ring"
            style={{ "--pct": Math.min(completion, 100) }}
          >
            <div className="hero-ring-inner">
              <div className="hero-ring-pct">{displayCompletion}%</div>
              <div className="hero-ring-label">complete</div>
            </div>
          </div>
          <div className="hero-counts">
            <span className="registered">{registered}</span>
            <span className="of-target">of {target} target</span>
          </div>
          {localPending > 0 && (
            <div className="hero-note">
              Includes {localPending} not yet synced from this device
            </div>
          )}
        </motion.div>

        {/* Sync status strip */}
        <div
          className="flex justify-between items-center mb-2"
          style={{ padding: "0 0.125rem" }}
        >
          <span className="text-xs font-semibold text-gray-600">
            Synchronization
          </span>
          <span
            className={`badge ${isOnline ? "badge-green" : "badge-yellow"}`}
          >
            {isOnline ? "ONLINE" : "OFFLINE"}
          </span>
        </div>
        <div className="status-strip">
          <div className="status-chip">
            <div className="status-chip-value pending">{localPending}</div>
            <div className="status-chip-label">Pending</div>
          </div>
          <div className="status-chip">
            <div className="status-chip-value synced">{synced}</div>
            <div className="status-chip-label">Synced</div>
          </div>
          <div className="status-chip">
            <div className="status-chip-value conflicts">{conflicts}</div>
            <div className="status-chip-label">Conflicts</div>
          </div>
        </div>
        {(localPending > 0 || localPendingComplaints > 0) && (
          <button
            className="btn btn-secondary mb-3"
            onClick={handleSync}
            disabled={!isOnline || syncing}
          >
            <RefreshCw size={14} className={syncing ? "spin" : ""} />
            {syncing
              ? "Syncing..."
              : `Sync ${localPending + localPendingComplaints} Item${
                  localPending + localPendingComplaints !== 1 ? "s" : ""
                }`}
          </button>
        )}

        <motion.button
          className="btn btn-primary mb-3 agent-cta-primary"
          onClick={() => navigate("/register")}
          whileTap={{ scale: 0.97 }}
        >
          <UserPlus size={22} />
          Register Person
        </motion.button>

        <button
          className="btn btn-secondary agent-cta-secondary"
          onClick={() => navigate("/complaint")}
        >
          <MessageSquareWarning size={16} />
          File a Complaint
          {localPendingComplaints > 0 && ` (${localPendingComplaints})`}
        </button>
      </div>
    </div>
  );
}
