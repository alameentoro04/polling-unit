import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  getMyRecords,
  updatePendingRegistration,
  deletePendingRegistration,
} from "../services/db";
import { useNetwork } from "../hooks/useNetwork";
import { api } from "../hooks/useAuth";
import {
  ArrowLeft,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";

export default function Records() {
  const navigate = useNavigate();
  const isOnline = useNetwork();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async ({ silent } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    const local = await getMyRecords();
    let merged = local;

    if (isOnline) {
      try {
        const res = await api.get("/agent/records");
        const serverRecords = res.data?.data || [];
        const localIds = new Set(local.map((r) => r.client_id));
        const serverOnly = serverRecords
          .filter((r) => !localIds.has(r.client_id))
          .map((r) => ({
            client_id: r.client_id,
            full_name: r.full_name,
            pvc_number: r.pvc_number,
            phone_number: r.phone_number,
            created_at: r.registered_at || r.created_at,
            sync_status: r.sync_status || "synced",
          }));
        merged = [...local, ...serverOnly];
      } catch (err) {
        console.error("Failed to fetch server records:", err);
      }
    }

    merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setRecords(merged);
    setLoading(false);
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return records;
    const q = query.trim().toLowerCase();
    return records.filter(
      (r) =>
        r.full_name?.toLowerCase().includes(q) ||
        r.pvc_number?.toLowerCase().includes(q)
    );
  }, [records, query]);

  const statusBadge = (status) => {
    const map = {
      synced: "bg-green-100 text-green-700",
      pending: "bg-yellow-100 text-yellow-700",
      conflict: "bg-red-100 text-red-700",
    };
    return (
      <span
        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          map[status] || "bg-gray-100 text-gray-600"
        }`}
      >
        {status === "synced"
          ? "Synced"
          : status === "pending"
          ? "Pending"
          : status === "conflict"
          ? "Conflict"
          : status}
      </span>
    );
  };

  const startEdit = (record) => {
    setEditing(record.client_id);
    setEditForm({
      full_name: record.full_name,
      phone_number: record.phone_number || "",
    });
  };

  const saveEdit = async () => {
    await updatePendingRegistration(editing, editForm);
    setEditing(null);
    loadRecords({ silent: true });
  };

  const handleDelete = async (clientId) => {
    if (!confirm("Delete this record?")) return;
    await deletePendingRegistration(clientId);
    loadRecords({ silent: true });
  };

  return (
    <div className="min-h-screen bg-[#f6f8f6]">
      <div className="mx-auto max-w-md px-4 pb-6 pt-6">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            aria-label="Back"
            className="tap-scale flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
          >
            <ArrowLeft size={18} className="text-[#1f2937]" />
          </button>
          <div className="flex-1">
            <div className="text-lg font-bold text-[#1f2937]">My Records</div>
            <div className="text-xs text-[#6b7280]">
              {records.length} total
            </div>
          </div>
          <button
            onClick={() => loadRecords({ silent: true })}
            disabled={refreshing}
            aria-label="Refresh"
            className="tap-scale flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={`text-[#1a5f2a] ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* Search */}
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-[#e5e7eb] bg-white px-3.5 py-2.5">
          <Search size={16} className="text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or PVC"
            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
        </div>

        {!isOnline && (
          <div className="mb-4 rounded-2xl bg-yellow-50 px-4 py-2.5 text-xs font-medium text-yellow-800">
            You're offline — showing records saved on this device only.
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl bg-gray-200"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-panel-light flex flex-col items-center rounded-3xl py-12 text-center">
            <div className="mb-1 text-base font-bold text-[#1f2937]">
              {query ? "No matches" : "No records yet"}
            </div>
            <div className="px-6 text-sm text-[#6b7280]">
              {query
                ? "Try a different name or PVC number."
                : 'Tap "Register Person" to add your first record.'}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <div
                key={r.client_id}
                className="rounded-2xl border border-[#eef2ef] bg-white p-4 shadow-sm"
              >
                {editing === r.client_id ? (
                  <div className="space-y-2">
                    <input
                      className="field-input"
                      value={editForm.full_name}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          full_name: e.target.value,
                        }))
                      }
                    />
                    <input
                      className="field-input"
                      value={editForm.phone_number}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          phone_number: e.target.value,
                        }))
                      }
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={saveEdit}
                        className="tap-scale flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#1a5f2a] py-2 text-sm font-semibold text-white"
                      >
                        <Check size={14} />
                        Save
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="tap-scale flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2 text-sm font-semibold text-gray-600"
                      >
                        <X size={14} />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-[#1f2937]">
                        {r.full_name}
                      </div>
                      <div className="text-xs text-[#6b7280]">
                        PVC: {r.pvc_number}
                      </div>
                      <div className="mt-0.5 text-[11px] text-gray-400">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleDateString()
                          : "—"}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {statusBadge(r.sync_status)}
                      {r.sync_status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(r)}
                            aria-label="Edit"
                            className="tap-scale text-[#1a5f2a]"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(r.client_id)}
                            aria-label="Delete"
                            className="tap-scale text-red-500"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}