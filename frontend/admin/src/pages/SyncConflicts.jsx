import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function SyncConflicts() {
  const { api } = useAuth();
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConflicts();
  }, []);

  const fetchConflicts = async () => {
    const res = await api.get("/sync-conflicts");
    setConflicts(res.data.data);
    setLoading(false);
  };

  const resolve = async (id, action) => {
    await api.post(`/sync-conflicts/${id}/resolve`, { action });
    fetchConflicts();
  };

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">Sync Conflicts</h1>
      <div className="card">
        {loading ? (
          <div className="text-center p-4">Loading...</div>
        ) : conflicts.length === 0 ? (
          <div className="text-center p-4 text-gray-500">
            No conflicts found
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>PVC</th>
                <th>Name</th>
                <th>Agent</th>
                <th>PU</th>
                <th>Existing ID</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {conflicts.map((c) => (
                <tr key={c.id}>
                  <td className="font-semibold">{c.pvc_number}</td>
                  <td>{c.full_name}</td>
                  <td>{c.registered_by?.full_name}</td>
                  <td>{c.polling_unit?.name}</td>
                  <td>{c.sync_metadata?.existing_registration_id}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => resolve(c.id, "merge")}
                    >
                      Merge
                    </button>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => resolve(c.id, "keep_both")}
                    >
                      Keep Both
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => resolve(c.id, "reject")}
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
