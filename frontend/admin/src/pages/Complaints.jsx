import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";

const statusColors = { open: "yellow", reviewed: "green", resolved: "gray" };

export default function Complaints() {
  const { api } = useAuth();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchRows();
  }, [statusFilter]);

  const fetchRows = async (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (statusFilter) params.append("status", statusFilter);
    if (search) params.append("q", search);
    const res = await api.get(`/complaints?${params}`);
    setRows(res.data.data);
    setPagination({
      current_page: res.data.current_page,
      last_page: res.data.last_page,
      total: res.data.total,
    });
    setLoading(false);
  };

  const handleStatusChange = async (id, status) => {
    await api.put(`/complaints/${id}/status`, { status });
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">Complaints</h1>

      <div className="filters-bar mb-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchRows(1);
          }}
          className="flex gap-2"
        >
          <input
            className="input"
            placeholder="Search complaint or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
        </form>
        <select
          className="select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="reviewed">Reviewed</option>
          <option value="resolved">Resolved</option>
        </select>
        <div className="text-xs text-gray-500 flex items-center">
          {loading
            ? "Loading…"
            : `${pagination.total?.toLocaleString() || 0} complaints`}
        </div>
      </div>

      {loading ? (
        <div className="card text-center p-4">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="card text-center p-4 text-gray-400">
          No complaints found.
        </div>
      ) : (
        rows.map((c) => (
          <div className="card mb-3" key={c.id}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-semibold">
                  {c.complainant_type === "voter"
                    ? c.complainant_name ||
                      "A registered voter (name not given)"
                    : `${c.submitted_by?.full_name} (agent observation)`}
                </div>
                <div className="text-xs text-gray-500">
                  {c.polling_unit?.name} · {c.ward?.name}, {c.lga?.name}
                  {" · "}
                  Reported by {c.submitted_by?.full_name}
                  {" · "}
                  {new Date(c.submitted_at).toLocaleString()}
                </div>
                {c.complainant_phone && (
                  <div className="text-xs text-gray-500">
                    📞 {c.complainant_phone}
                  </div>
                )}
              </div>
              <span className={`badge badge-${statusColors[c.status]}`}>
                {c.status}
              </span>
            </div>

            <div
              className="text-sm"
              style={{
                maxHeight: expandedId === c.id ? "none" : "3.2em",
                overflow: "hidden",
                cursor: "pointer",
              }}
              onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
            >
              {c.complaint_text}
            </div>

            <div className="flex gap-2 mt-3">
              {c.status !== "reviewed" && (
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleStatusChange(c.id, "reviewed")}
                >
                  Mark Reviewed
                </button>
              )}
              {c.status !== "resolved" && (
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => handleStatusChange(c.id, "resolved")}
                >
                  Mark Resolved
                </button>
              )}
              {c.status !== "open" && (
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleStatusChange(c.id, "open")}
                >
                  Reopen
                </button>
              )}
            </div>
          </div>
        ))
      )}

      {pagination.last_page > 1 && (
        <div className="pagination">
          {Array.from({ length: pagination.last_page }, (_, i) => (
            <button
              key={i}
              className={pagination.current_page === i + 1 ? "active" : ""}
              onClick={() => fetchRows(i + 1)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
