import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useNetwork } from "../hooks/useNetwork";
import { getPendingCount, getConflictCount } from "../services/db";
import { syncPendingRecords } from "../services/sync";

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

  const loadLocalCounts = useCallback(async () => {
    const [pending, conflicts] = await Promise.all([
      getPendingCount(),
      getConflictCount(),
    ]);
    setLocalPending(pending);
    setLocalConflicts(conflicts);
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
    await syncPendingRecords();
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

        {/* Progress Card */}
        <div className="card">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-600">
              Progress
            </span>
            <span className="text-sm font-bold text-primary">
              {completion}%
            </span>
          </div>
          <div className="progress-bar mb-2">
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.min(completion, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Target: {target}</span>
            <span>Registered: {registered}</span>
          </div>
          {localPending > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              Includes {localPending} not yet synced from this device
            </div>
          )}
        </div>

        {/* Sync status */}
        <div className="card">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-gray-600">
              Synchronization
            </span>
            <span
              className={`badge ${isOnline ? "badge-green" : "badge-yellow"}`}
            >
              {isOnline ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
          <div className="flex justify-between text-sm mb-3">
            <div className="text-center">
              <div className="font-bold text-lg">{localPending}</div>
              <div className="text-xs text-gray-500">Pending</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-primary">{synced}</div>
              <div className="text-xs text-gray-500">Synced</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-danger">{conflicts}</div>
              <div className="text-xs text-gray-500">Conflicts</div>
            </div>
          </div>
          {localPending > 0 && (
            <button
              className="btn btn-primary"
              onClick={handleSync}
              disabled={!isOnline || syncing}
            >
              {syncing
                ? "Syncing..."
                : `Sync ${localPending} Record${localPending !== 1 ? "s" : ""}`}
            </button>
          )}
        </div>

        <button
          className="btn btn-primary mb-3"
          style={{ fontSize: "1.1rem", padding: "1rem" }}
          onClick={() => navigate("/register")}
        >
          + Register Person
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
