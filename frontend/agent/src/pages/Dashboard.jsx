import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useNetwork } from "../hooks/useNetwork";
import { getPendingCount, getConflictCount } from "../services/db";
import { syncPendingRecords } from "../services/sync";
import {
  MapPin,
  Wifi,
  WifiOff,
  RefreshCw,
  ClipboardList,
  ListChecks,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

const CACHE_KEY = "cached_agent_dashboard";

export default function Dashboard() {
  const { user, api } = useAuth();
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
  const [countsLoaded, setCountsLoaded] = useState(false);

  const loadLocalCounts = useCallback(async () => {
    const [pending, conflicts] = await Promise.all([
      getPendingCount(),
      getConflictCount(),
    ]);
    setLocalPending(pending);
    setLocalConflicts(conflicts);
    setCountsLoaded(true);
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

  const firstName = (user?.name || user?.username || "Agent").split(" ")[0];

  return (
    <div className="min-h-screen bg-[#f6f8f6]">
      <div className="mx-auto max-w-md px-4 pb-4 pt-6">
        {/* Hero header */}
        <div
          className="glass-bubble animate-fade-slide-up relative mb-4 overflow-hidden rounded-3xl p-5"
          style={{ boxShadow: "0 14px 34px rgba(18,74,31,0.28)" }}
        >
          <div className="mb-3 flex items-start justify-between">
            <div>
              <div className="text-xs font-medium text-white/70">
                Welcome back
              </div>
              <div className="text-xl font-bold text-white">{firstName}</div>
            </div>
            <span
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                isOnline
                  ? "bg-white/20 text-white"
                  : "bg-yellow-400/90 text-[#5c4400]"
              }`}
            >
              {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-white/12 px-3 py-2.5">
            <MapPin size={16} className="shrink-0 text-white/80" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">
                {assignment?.polling_unit_name || "Not Assigned"}
              </div>
              <div className="truncate text-[11px] text-white/65">
                {assignment?.ward_name || "—"} &middot;{" "}
                {assignment?.lga_name || "—"}
              </div>
            </div>
          </div>
        </div>

        {loadError && (
          <div className="animate-fade-slide-up mb-4 flex items-center gap-2 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs font-medium text-yellow-800">
            <AlertTriangle size={16} className="shrink-0" />
            Couldn't reach the server — showing offline-only numbers until
            you're back online.
          </div>
        )}

        {!countsLoaded ? (
          <div className="mb-4 space-y-4">
            <div className="h-32 animate-pulse rounded-3xl bg-gray-200" />
            <div className="h-40 animate-pulse rounded-3xl bg-gray-200" />
          </div>
        ) : (
          <>
            {/* Progress card */}
            <div
              className="glass-panel-light animate-fade-slide-up mb-4 rounded-3xl p-5"
              style={{ animationDelay: "0.05s" }}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-[#1f2937]">
                  Registration progress
                </span>
                <span className="text-lg font-extrabold text-[#1a5f2a]">
                  {completion}%
                </span>
              </div>
              <div className="mb-3 h-3 w-full overflow-hidden rounded-full bg-[#e6efe8]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#2d8a42] to-[#1a5f2a] transition-all duration-700 ease-out"
                  style={{ width: `${Math.min(completion, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-[#6b7280]">
                <span>Target: {target}</span>
                <span>Registered: {registered}</span>
              </div>
              {localPending > 0 && (
                <div className="mt-2 text-xs text-[#6b7280]">
                  Includes {localPending} not yet synced from this device
                </div>
              )}
            </div>

            {/* Sync status card */}
            <div
              className="glass-panel-light animate-fade-slide-up mb-5 rounded-3xl p-5"
              style={{ animationDelay: "0.1s" }}
            >
              <div className="mb-4 text-sm font-semibold text-[#1f2937]">
                Synchronization
              </div>
              <div className="mb-4 grid grid-cols-3 gap-2">
                <StatPill label="Pending" value={localPending} tone="neutral" />
                <StatPill label="Synced" value={synced} tone="green" />
                <StatPill label="Conflicts" value={conflicts} tone="red" />
              </div>
              {localPending > 0 && (
                <button
                  onClick={handleSync}
                  disabled={!isOnline || syncing}
                  className="tap-scale flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1a5f2a] py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  <RefreshCw
                    size={16}
                    className={syncing ? "animate-spin" : ""}
                  />
                  {syncing
                    ? "Syncing..."
                    : `Sync ${localPending} Record${
                        localPending !== 1 ? "s" : ""
                      }`}
                </button>
              )}
            </div>
          </>
        )}

        {/* Quick actions */}
        <div
          className="animate-fade-slide-up space-y-3"
          style={{ animationDelay: "0.15s" }}
        >
          <button
            onClick={() => navigate("/register")}
            className="tap-scale flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-[#2d8a42] to-[#1a5f2a] px-5 py-4 text-white shadow-lg"
          >
            <span className="flex items-center gap-3">
              <ClipboardList size={20} />
              <span className="text-sm font-bold">Register Person</span>
            </span>
            <ChevronRight size={18} className="opacity-80" />
          </button>

          <button
            onClick={() => navigate("/records")}
            className="tap-scale flex w-full items-center justify-between rounded-2xl border border-[#d8e6db] bg-white px-5 py-4 text-[#1f2937] shadow-sm"
          >
            <span className="flex items-center gap-3">
              <ListChecks size={20} className="text-[#1a5f2a]" />
              <span className="text-sm font-bold">My Records</span>
            </span>
            <ChevronRight size={18} className="text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value, tone }) {
  const toneClasses = {
    neutral: "text-[#1f2937]",
    green: "text-[#1a5f2a]",
    red: "text-red-600",
  };
  return (
    <div className="rounded-2xl bg-[#f6f8f6] py-3 text-center">
      <div className={`text-lg font-extrabold ${toneClasses[tone]}`}>
        {value}
      </div>
      <div className="text-[11px] font-medium text-[#6b7280]">{label}</div>
    </div>
  );
}