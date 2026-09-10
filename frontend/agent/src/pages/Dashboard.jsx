import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useNetwork } from "../hooks/useNetwork";
import {
  getPendingCount,
  getConflictCount,
  getPendingComplaintCount,
} from "../services/db";
import { syncPendingRecords, syncPendingComplaints } from "../services/sync";

const CACHE_KEY = "cached_agent_dashboard";

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

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center mb-3">
          <div>
            <div className="text-xs opacity-80">My Polling Unit</div>
            <div className="text-lg font-bold">
              {assignment?.polling_unit_name || "Not Assigned"}
            </div>
          </div>
          <button
            onClick={logout}
            className="text-xs opacity-80"
            style={{ color: "white" }}
          >
            Logout
          </button>
        </div>
        <div className="flex gap-2 text-xs opacity-80">
          <span>{assignment?.ward_name || "—"}</span>
          <span>•</span>
          <span>{assignment?.lga_name || "—"}</span>
        </div>
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

        <div className="card hero-progress">
          <div
            className="hero-ring"
            style={{ "--pct": Math.min(completion, 100) }}
          >
            <div className="hero-ring-inner">
              <div className="hero-ring-pct">{completion}%</div>
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
        </div>

        {/* Sync status */}
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
            {syncing
              ? "Syncing..."
              : `Sync ${localPending + localPendingComplaints} Item${
                  localPending + localPendingComplaints !== 1 ? "s" : ""
                }`}
          </button>
        )}

        <button
          className="btn btn-primary mb-3"
          style={{ fontSize: "1.1rem", padding: "1rem" }}
          onClick={() => navigate("/register")}
        >
          + Register Person
        </button>

        <button
          className="btn btn-secondary mb-3"
          onClick={() => navigate("/complaint")}
        >
          📢 File a Complaint
          {localPendingComplaints > 0 && ` (${localPendingComplaints} pending)`}
        </button>

        <button
          className="btn btn-secondary"
          onClick={() => navigate("/records")}
        >
          My Records
        </button>
      </div>
    </div>
  );
}
