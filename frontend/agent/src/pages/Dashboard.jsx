import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useNetwork } from "../hooks/useNetwork";
import {
  getPendingCount,
  getSyncedCount,
  getConflictCount,
} from "../services/db";
import { syncPendingRecords } from "../services/sync";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const isOnline = useNetwork();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    target: 10,
    registered: 0,
    pending: 0,
    synced: 0,
    conflicts: 0,
  });
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const [pending, synced, conflicts] = await Promise.all([
      getPendingCount(),
      getSyncedCount(),
      getConflictCount(),
    ]);
    setStats((s) => ({
      ...s,
      registered: synced + pending + conflicts,
      pending,
      synced,
      conflicts,
    }));
  };

  const handleSync = async () => {
    if (!isOnline || syncing) return;
    setSyncing(true);
    await syncPendingRecords();
    await loadStats();
    setSyncing(false);
  };

  const assignment = user?.assignment;
  const completion =
    stats.target > 0 ? Math.round((stats.registered / stats.target) * 100) : 0;

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
          <span>{assignment?.ward || "—"}</span>
          <span>•</span>
          <span>{assignment?.lga || "—"}</span>
        </div>
      </div>

      <div className="container">
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
            <span>Target: {stats.target}</span>
            <span>Registered: {stats.registered}</span>
          </div>
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
              <div className="font-bold text-lg">{stats.pending}</div>
              <div className="text-xs text-gray-500">Pending</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-primary">
                {stats.synced}
              </div>
              <div className="text-xs text-gray-500">Synced</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-danger">
                {stats.conflicts}
              </div>
              <div className="text-xs text-gray-500">Conflicts</div>
            </div>
          </div>
          {stats.pending > 0 && (
            <button
              className="btn btn-primary"
              onClick={handleSync}
              disabled={!isOnline || syncing}
            >
              {syncing
                ? "Syncing..."
                : `Sync ${stats.pending} Record${
                    stats.pending !== 1 ? "s" : ""
                  }`}
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
