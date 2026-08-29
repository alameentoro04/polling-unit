import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function AuditLogs() {
  const { api } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const res = await api.get("/audit-logs");
    setLogs(res.data.data);
    setLoading(false);
  };

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">Audit Logs</h1>
      <div className="card">
        {loading ? (
          <div className="text-center p-4">Loading...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.created_at).toLocaleString()}</td>
                  <td>{log.actor?.full_name || "System"}</td>
                  <td>
                    <span className="badge badge-blue">{log.action}</span>
                  </td>
                  <td>
                    {log.entity_type} #{log.entity_id}
                  </td>
                  <td className="text-xs">
                    {JSON.stringify(log.after_state)?.substring(0, 80)}...
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
