import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";

function RegistrationDetailModal({ id, onClose }) {
  const { api } = useAuth();
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/registrations/${id}`)
      .then((res) => setRecord(res.data))
      .catch(() => setError("Couldn't load this record."));
  }, [id, api]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="card-title">Registration Details</div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {error && <div className="text-sm text-danger">{error}</div>}
        {!record && !error && (
          <div className="text-sm text-gray-500">Loading…</div>
        )}

        {record && (
          <>
            {record.photograph_url && (
              <img
                src={record.photograph_url}
                alt={record.full_name}
                className="rounded-lg mb-3"
                style={{ maxHeight: 180, width: "auto" }}
              />
            )}
            <dl>
              <div className="detail-row">
                <dt>PVC Number</dt>
                <dd>{record.pvc_number}</dd>
              </div>
              <div className="detail-row">
                <dt>Full Name</dt>
                <dd>{record.full_name}</dd>
              </div>
              <div className="detail-row">
                <dt>Phone Number</dt>
                <dd>{record.phone_number || "—"}</dd>
              </div>
              <div className="detail-row">
                <dt>Date of Birth</dt>
                <dd>{record.date_of_birth || "—"}</dd>
              </div>
              <div className="detail-row">
                <dt>Gender</dt>
                <dd className="capitalize">{record.gender || "—"}</dd>
              </div>
              <div className="detail-row">
                <dt>Polling Unit</dt>
                <dd>{record.polling_unit?.name || "—"}</dd>
              </div>
              <div className="detail-row">
                <dt>Ward</dt>
                <dd>{record.ward?.name || "—"}</dd>
              </div>
              <div className="detail-row">
                <dt>LGA</dt>
                <dd>{record.lga?.name || "—"}</dd>
              </div>
              <div className="detail-row">
                <dt>Registered By</dt>
                <dd>{record.registered_by?.full_name || "—"}</dd>
              </div>
              <div className="detail-row">
                <dt>Registered At</dt>
                <dd>{new Date(record.registered_at).toLocaleString()}</dd>
              </div>
              <div className="detail-row">
                <dt>Sync Status</dt>
                <dd className="capitalize">{record.sync_status}</dd>
              </div>
              {record.gps_latitude && (
                <div className="detail-row">
                  <dt>GPS Location</dt>
                  <dd>
                    {Number(record.gps_latitude).toFixed(5)},{" "}
                    {Number(record.gps_longitude).toFixed(5)}
                  </dd>
                </div>
              )}
            </dl>

            {record.dynamic_data &&
              Object.keys(record.dynamic_data).length > 0 && (
                <>
                  <div className="text-xs text-gray-500 uppercase font-semibold mt-3 mb-1">
                    Additional Fields
                  </div>
                  <dl>
                    {Object.entries(record.dynamic_data).map(([key, value]) => (
                      <div className="detail-row" key={key}>
                        <dt>{key.replace(/_/g, " ")}</dt>
                        <dd>{String(value) || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
          </>
        )}
      </div>
    </div>
  );
}

export default function Registrations() {
  const { api, user } = useAuth();
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
  const [viewingId, setViewingId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    fetchRecords();
  }, []);

  const buildParams = (extra = {}) => {
    const params = new URLSearchParams({ ...filters, ...extra });

    for (const [key, value] of [...params.entries()]) {
      if (!value) params.delete(key);
    }
    if (search) params.append("q", search);
    return params;
  };

  const fetchRecords = async (page = 1) => {
    setLoading(true);
    try {
      const params = buildParams({ page: String(page) });
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

  const handleExport = async () => {
    setExporting(true);
    setExportError("");
    try {
      const params = buildParams();
      const res = await api.get(`/export/registrations?${params}`);
      const link = document.createElement("a");
      link.href = res.data.download_url;
      link.download = res.data.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      setExportError(
        e.response?.data?.message || "Export failed. Please try again."
      );
    } finally {
      setExporting(false);
    }
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
        <button
          className="btn btn-secondary"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? "Exporting…" : "Export Excel"}
        </button>
      </div>

      {exportError && <div className="badge badge-red mb-3">{exportError}</div>}

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
                  <th>Actions</th>
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
                    <td>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => setViewingId(r.id)}
                      >
                        View
                      </button>
                      {user?.role === "admin" && (
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(r.id)}
                        >
                          Delete
                        </button>
                      )}
                    </td>
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

      {viewingId && (
        <RegistrationDetailModal
          id={viewingId}
          onClose={() => setViewingId(null)}
        />
      )}
    </div>
  );
}
