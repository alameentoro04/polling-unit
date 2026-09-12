import { useEffect, useState } from "react";
import { Landmark as LandmarkIcon } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useLocations } from "../hooks/useLocations";
import SkeletonTable from "../components/SkeletonTable";
import EmptyState from "../components/EmptyState";

function WardFormModal({ editing, defaultLga, onClose, onSaved }) {
  const { api } = useAuth();
  const { lgas } = useLocations();
  const [lgaId, setLgaId] = useState(editing?.lga_id ? String(editing.lga_id) : defaultLga || "");
  const [name, setName] = useState(editing?.name || "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      if (editing) {
        await api.put(`/wards/${editing.id}`, { lga_id: lgaId, name });
      } else {
        await api.post("/wards", { lga_id: lgaId, name });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.name?.[0] || "Failed to save ward");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="card-title">{editing ? "Edit" : "Add"} Ward</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="badge badge-red mb-3">{error}</div>}
          <div className="form-group">
            <label className="label">LGA *</label>
            <select className="input" value={lgaId} onChange={(e) => setLgaId(e.target.value)} required>
              <option value="">Select LGA...</option>
              {lgas.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="label">Ward Name *</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary w-full mt-3" disabled={submitting}>
            {submitting ? "Saving..." : editing ? "Save Changes" : "Create Ward"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Wards() {
  const { api } = useAuth();
  const { lgas } = useLocations();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [lgaFilter, setLgaFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingWard, setEditingWard] = useState(null);

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lgaFilter]);

  const fetchRows = async (page = 1) => {
    setLoading(true);
    setLoadError("");
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.append("q", search);
    if (lgaFilter) params.append("lga_id", lgaFilter);
    try {
      const res = await api.get(`/wards?${params}`);
      setRows(res.data.data);
      setPagination({ current_page: res.data.current_page, last_page: res.data.last_page, total: res.data.total });
    } catch (e) {
      console.error("Failed to load wards:", e.response?.data || e.message);
      setLoadError(e.response?.data?.message || "Couldn't load wards. Check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ward) => {
    if (!confirm(`Delete "${ward.name}"?`)) return;
    try {
      await api.delete(`/wards/${ward.id}`);
      fetchRows(pagination.current_page);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete ward");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-bold">Wards</h1>
        <button className="btn btn-primary" onClick={() => { setEditingWard(null); setShowForm(true); }}>
          + Add Ward
        </button>
      </div>

      <div className="filters-bar mb-3">
        <form onSubmit={(e) => { e.preventDefault(); fetchRows(1); }} className="flex gap-2">
          <input className="input" placeholder="Search ward name..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>
        <select className="select" value={lgaFilter} onChange={(e) => setLgaFilter(e.target.value)}>
          <option value="">All LGAs</option>
          {lgas.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <div className="text-xs text-gray-500 flex items-center">
          {loading ? "Loading…" : `${pagination.total?.toLocaleString() || 0} wards`}
        </div>
      </div>

      {loadError && (
        <div className="badge badge-red mb-3" style={{ width: "100%", justifyContent: "center", padding: "0.75rem" }}>
          {loadError}
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={6} columns={5} />
      ) : loadError ? null : rows.length === 0 ? (
        <div className="card">
          <EmptyState icon={LandmarkIcon} title="No wards found" description="Try adjusting your search or filters." />
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="data-table-wrap desktop-only">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>LGA</th>
                  <th>Polling Units</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((w) => (
                  <tr key={w.id}>
                    <td className="font-semibold">{w.code}</td>
                    <td>{w.name}</td>
                    <td>{w.lga?.name}</td>
                    <td>{w.polling_units_count}</td>
                    <td className="flex gap-2">
                      <button className="btn btn-sm btn-secondary" onClick={() => { setEditingWard(w); setShowForm(true); }}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(w)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobile-only" style={{ padding: "0.75rem" }}>
            {rows.map((w) => (
              <div className="mobile-row-card" key={w.id}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{w.name}</div>
                    <div className="text-xs text-gray-500">{w.code}</div>
                  </div>
                  <span className="text-xs text-gray-500">{w.polling_units_count} PUs</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">{w.lga?.name}</div>
                <div className="flex gap-2 mt-2">
                  <button className="btn btn-sm btn-secondary" style={{ flex: 1 }} onClick={() => { setEditingWard(w); setShowForm(true); }}>Edit</button>
                  <button className="btn btn-sm btn-danger" style={{ flex: 1 }} onClick={() => handleDelete(w)}>Delete</button>
                </div>
              </div>
            ))}
          </div>

          <div className="pagination">
            {Array.from({ length: pagination.last_page || 1 }, (_, i) => (
              <button key={i} className={pagination.current_page === i + 1 ? "active" : ""} onClick={() => fetchRows(i + 1)}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <WardFormModal
          editing={editingWard}
          defaultLga={lgaFilter}
          onClose={() => setShowForm(false)}
          onSaved={() => fetchRows(pagination.current_page || 1)}
        />
      )}
    </div>
  );
}
