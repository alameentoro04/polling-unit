import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function Registrations() {
  const { api, user } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    lga_id: "",
    ward_id: "",
    polling_unit_id: "",
    date_from: "",
    date_to: "",
  });

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), ...filters });
      if (search) params.append("q", search);
      const res = await api.get(`/registrations?${params}`);
      setRecords(res.data.data);
      setPagination({
        current_page: res.data.current_page,
        last_page: res.data.last_page,
        total: res.data.total,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchRecords(1);
  };

  const handleDelete = async (id) => {
    if (!confirm("Soft-delete this registration?")) return;
    await api.delete(`/registrations/${id}`);
    fetchRecords(pagination.current_page);
  };

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">Registration Records</h1>

      <div className="filters-bar">
        <form onSubmit={handleSearch} className="flex gap-2 items-center">
          <input
            className="input"
            placeholder="Search PVC, name, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>
        <button className="btn btn-secondary" onClick={() => fetchRecords(1)}>
          Refresh
        </button>
        <button className="btn btn-secondary">Export Excel</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="text-center p-4">Loading...</div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>PVC</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Polling Unit</th>
                  <th>Agent</th>
                  <th>Date</th>
                  <th>Status</th>
                  {user?.role === "admin" && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td className="font-semibold">{r.pvc_number}</td>
                    <td>{r.full_name}</td>
                    <td>{r.phone_number}</td>
                    <td>{r.polling_unit?.name}</td>
                    <td>{r.registered_by?.full_name}</td>
                    <td>{new Date(r.registered_at).toLocaleDateString()}</td>
                    <td>
                      <span
                        className={`badge badge-${
                          r.sync_status === "synced"
                            ? "green"
                            : r.sync_status === "conflict"
                            ? "red"
                            : "yellow"
                        }`}
                      >
                        {r.sync_status}
                      </span>
                    </td>
                    {user?.role === "admin" && (
                      <td>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(r.id)}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination">
              {Array.from({ length: pagination.last_page || 1 }, (_, i) => (
                <button
                  key={i}
                  className={pagination.current_page === i + 1 ? "active" : ""}
                  onClick={() => fetchRecords(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
