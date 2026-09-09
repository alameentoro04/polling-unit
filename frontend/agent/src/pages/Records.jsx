import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getMyRecords,
  updatePendingRegistration,
  deletePendingRegistration,
} from "../services/db";
import { useAuth } from "../hooks/useAuth";
import { useNetwork } from "../hooks/useNetwork";

export default function Records() {
  const navigate = useNavigate();
  const { api } = useAuth();
  const isOnline = useNetwork();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    loadRecords();
  }, [isOnline]);

  const loadRecords = async () => {
    const local = await getMyRecords();

    if (isOnline) {
      try {
        const res = await api.get("/agent/records");
        const serverRecords = res.data.data.map((r) => ({
          client_id: `server-${r.id}`,
          pvc_number: r.pvc_number,
          full_name: r.full_name,
          created_at: r.registered_at,
          sync_status: "synced",
        }));
        const localOnly = local.filter(
          (l) =>
            l.sync_status !== "synced" ||
            !serverRecords.some((s) => s.pvc_number === l.pvc_number)
        );
        const merged = [...localOnly, ...serverRecords].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        setRecords(merged);
        setLoading(false);
        return;
      } catch (e) {}
    }

    setRecords(local);
    setLoading(false);
  };

  const statusBadge = (status) => {
    switch (status) {
      case "synced":
        return <span className="badge badge-green">Synced</span>;
      case "pending":
        return <span className="badge badge-yellow">Pending</span>;
      case "conflict":
        return <span className="badge badge-red">Conflict</span>;
      default:
        return <span className="badge badge-gray">{status}</span>;
    }
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
    loadRecords();
  };

  const handleDelete = async (clientId) => {
    if (!confirm("Delete this record?")) return;
    await deletePendingRegistration(clientId);
    loadRecords();
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/")}
            style={{ color: "white", fontSize: "1.25rem" }}
          >
            ←
          </button>
          <div className="text-lg font-bold">My Records</div>
        </div>
      </div>

      <div className="container">
        {loading ? (
          <div className="empty-state">Loading...</div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <div className="text-lg mb-2">No records yet</div>
            <div className="text-sm">
              Tap "Register Person" to add your first record.
            </div>
          </div>
        ) : (
          records.map((r) => (
            <div key={r.client_id} className="record-item">
              {editing === r.client_id && r.sync_status === "pending" ? (
                <div style={{ flex: 1 }}>
                  <input
                    className="input"
                    value={editForm.full_name}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, full_name: e.target.value }))
                    }
                  />
                  <input
                    className="input mt-1"
                    value={editForm.phone_number}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        phone_number: e.target.value,
                      }))
                    }
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={saveEdit}
                    >
                      Save
                    </button>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setEditing(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-semibold text-sm">{r.full_name}</div>
                  <div className="text-xs text-gray-500">
                    PVC: {r.pvc_number}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                {r.sync_status === "pending" && editing !== r.client_id && (
                  <>
                    <button
                      className="text-xs text-primary"
                      onClick={() => startEdit(r)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-xs text-danger"
                      onClick={() => handleDelete(r.client_id)}
                    >
                      Delete
                    </button>
                  </>
                )}
                {statusBadge(r.sync_status)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
