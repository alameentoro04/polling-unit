import { useEffect, useState } from "react";
import { MapPin as MapPinIcon } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useLocations } from "../hooks/useLocations";
import SkeletonTable from "../components/SkeletonTable";
import EmptyState from "../components/EmptyState";

const emptyForm = {
  ward_id: "",
  code: "",
  name: "",
  location: "",
  latitude: "",
  longitude: "",
  target_count: "",
};

function PollingUnitFormModal({ editing, defaultLga, onClose, onSaved }) {
  const { api } = useAuth();
  const { lgas, wards, loadWards } = useLocations();
  const [lgaId, setLgaId] = useState(defaultLga || "");
  const [form, setForm] = useState(
    editing
      ? {
          ward_id: editing.ward_id,
          code: editing.code,
          name: editing.name,
          location: editing.location || "",
          latitude: editing.latitude ?? "",
          longitude: editing.longitude ?? "",
          target_count: editing.target_count ?? "",
        }
      : emptyForm
  );
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editing?.ward?.lga_id) {
      setLgaId(String(editing.ward.lga_id));
      loadWards(editing.ward.lga_id);
    } else if (defaultLga) {
      loadWards(defaultLga);
    }
  }, []);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const fieldError = (field) => errors[field]?.[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    const payload = {
      ...form,
      latitude: form.latitude === "" ? null : form.latitude,
      longitude: form.longitude === "" ? null : form.longitude,
      target_count: form.target_count === "" ? null : form.target_count,
    };
    try {
      if (editing) {
        await api.put(`/polling-units/${editing.id}`, payload);
      } else {
        await api.post("/polling-units", payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setErrors(
        err.response?.data?.errors || {
          _: [err.response?.data?.message || "Failed to save"],
        }
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="card-title">
            {editing ? "Edit" : "Add"} Polling Unit
          </div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {errors._ && (
            <div className="badge badge-red mb-3">{errors._[0]}</div>
          )}

          <div className="form-group">
            <label className="label">LGA *</label>
            <select
              className="input"
              value={lgaId}
              onChange={(e) => {
                setLgaId(e.target.value);
                set("ward_id", "");
                loadWards(e.target.value);
              }}
              required
            >
              <option value="">Select LGA...</option>
              {lgas.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label">Ward *</label>
            <select
              className="input"
              value={form.ward_id}
              onChange={(e) => set("ward_id", e.target.value)}
              required
              disabled={!lgaId}
            >
              <option value="">Select Ward...</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            {fieldError("ward_id") && (
              <div className="text-xs text-danger">{fieldError("ward_id")}</div>
            )}
          </div>

          <div className="form-group">
            <label className="label">Polling Unit Code *</label>
            <input
              className="input"
              value={form.code}
              onChange={(e) => set("code", e.target.value)}
              required
            />
            {fieldError("code") && (
              <div className="text-xs text-danger">{fieldError("code")}</div>
            )}
          </div>

          <div className="form-group">
            <label className="label">Polling Unit Name *</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
            {fieldError("name") && (
              <div className="text-xs text-danger">{fieldError("name")}</div>
            )}
          </div>

          <div className="form-group">
            <label className="label">Location Description</label>
            <input
              className="input"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="e.g. Primary School, Along Main Road"
            />
          </div>

          <div className="flex gap-2">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="label">Latitude</label>
              <input
                className="input"
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => set("latitude", e.target.value)}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="label">Longitude</label>
              <input
                className="input"
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) => set("longitude", e.target.value)}
              />
            </div>
          </div>
          <div
            className="text-xs text-gray-500 mb-3"
            style={{ marginTop: "-0.5rem" }}
          >
            Leave both blank if unknown — it'll get a placeholder position near
            its ward on the map until corrected.
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="label">Target Registrations</label>
            <input
              className="input"
              type="number"
              min="1"
              value={form.target_count}
              onChange={(e) => set("target_count", e.target.value)}
              placeholder="Defaults to the statewide setting"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full mt-3"
            disabled={submitting}
          >
            {submitting
              ? "Saving..."
              : editing
              ? "Save Changes"
              : "Create Polling Unit"}
          </button>
        </form>
      </div>
    </div>
  );
}

function PollingUnitDetailModal({ id, onClose }) {
  const { api } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/polling-units/${id}`).then((res) => setData(res.data));
  }, [id, api]);

  const pu = data?.polling_unit;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="card-title">{pu?.name || "Loading…"}</div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        {pu && (
          <>
            <dl className="mb-3">
              <div className="detail-row">
                <dt>Code</dt>
                <dd>{pu.code}</dd>
              </div>
              <div className="detail-row">
                <dt>Ward</dt>
                <dd>{pu.ward?.name}</dd>
              </div>
              <div className="detail-row">
                <dt>LGA</dt>
                <dd>{pu.ward?.lga?.name}</dd>
              </div>
              <div className="detail-row">
                <dt>Target</dt>
                <dd>{pu.target_count}</dd>
              </div>
              <div className="detail-row">
                <dt>Registered</dt>
                <dd>{pu.registered_count}</dd>
              </div>
              <div className="detail-row">
                <dt>Current Agent</dt>
                <dd>{pu.assigned_agent?.full_name || "Unassigned"}</dd>
              </div>
              <div className="detail-row">
                <dt>Status</dt>
                <dd>{pu.is_active ? "Active" : "Deactivated"}</dd>
              </div>
            </dl>
            <div className="text-xs text-gray-500 uppercase font-semibold mb-2">
              Agent Assignment History
            </div>
            {data.assignment_history.length === 0 ? (
              <div className="text-sm text-gray-400">
                No agents have ever been assigned here.
              </div>
            ) : (
              data.assignment_history.map((a) => (
                <div className="detail-row" key={a.id}>
                  <dt>{a.user?.full_name}</dt>
                  <dd>
                    {new Date(a.assigned_at).toLocaleDateString()} –{" "}
                    {a.unassigned_at
                      ? new Date(a.unassigned_at).toLocaleDateString()
                      : "Present"}
                  </dd>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function PollingUnits() {
  const { api } = useAuth();
  const { lgas, wards, loadWards } = useLocations();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [lgaFilter, setLgaFilter] = useState("");
  const [wardFilter, setWardFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingPu, setEditingPu] = useState(null);
  const [viewingId, setViewingId] = useState(null);

  useEffect(() => {
    fetchRows();
  }, [lgaFilter, wardFilter, statusFilter]);

  const fetchRows = async (page = 1) => {
    setLoading(true);
    setLoadError("");
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.append("q", search);
    if (lgaFilter) params.append("lga_id", lgaFilter);
    if (wardFilter) params.append("ward_id", wardFilter);
    if (statusFilter) params.append("status", statusFilter);
    try {
      const res = await api.get(`/polling-units?${params}`);
      setRows(res.data.data);
      setPagination({
        current_page: res.data.current_page,
        last_page: res.data.last_page,
        total: res.data.total,
      });
    } catch (e) {
      console.error(
        "Failed to load polling units:",
        e.response?.data || e.message
      );
      setLoadError(
        e.response?.data?.message ||
          "Couldn't load polling units. Check the console for details."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (pu) => {
    if (
      !confirm(
        `Delete "${pu.name}"? If it has any history it'll be deactivated instead of removed.`
      )
    )
      return;
    const res = await api.delete(`/polling-units/${pu.id}`);
    alert(res.data.message);
    fetchRows(pagination.current_page);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-bold">Polling Units</h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingPu(null);
            setShowForm(true);
          }}
        >
          + Add Polling Unit
        </button>
      </div>

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
            placeholder="Search name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
        </form>
        <select
          className="select"
          value={lgaFilter}
          onChange={(e) => {
            setLgaFilter(e.target.value);
            setWardFilter("");
            loadWards(e.target.value);
          }}
        >
          <option value="">All LGAs</option>
          {lgas.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={wardFilter}
          onChange={(e) => setWardFilter(e.target.value)}
          disabled={!lgaFilter}
        >
          <option value="">All Wards</option>
          {wards.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Deactivated</option>
        </select>
        <div className="text-xs text-gray-500 flex items-center">
          {loading
            ? "Loading…"
            : `${pagination.total?.toLocaleString() || 0} polling units`}
        </div>
      </div>

      {loadError && (
        <div
          className="badge badge-red mb-3"
          style={{
            width: "100%",
            justifyContent: "center",
            padding: "0.75rem",
          }}
        >
          {loadError}
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={8} columns={7} />
      ) : loadError ? null : rows.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={MapPinIcon}
            title="No polling units found"
            description="Try adjusting your search or filters."
          />
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {/* Desktop table */}
          <div className="data-table-wrap desktop-only">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Ward</th>
                  <th>LGA</th>
                  <th>Agent</th>
                  <th>Registered / Target</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((pu) => (
                  <tr key={pu.id} onClick={() => setViewingId(pu.id)}>
                    <td className="font-semibold">{pu.code}</td>
                    <td>{pu.name}</td>
                    <td>{pu.ward?.name}</td>
                    <td>{pu.ward?.lga?.name}</td>
                    <td>
                      {pu.assigned_agent?.full_name || (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td>
                      {pu.registered_count} / {pu.target_count}
                    </td>
                    <td>
                      <span
                        className={`badge badge-${
                          pu.is_active ? "green" : "gray"
                        }`}
                      >
                        {pu.is_active ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td
                      className="flex gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => {
                          setEditingPu(pu);
                          setShowForm(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(pu)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mobile-only" style={{ padding: "0.75rem" }}>
            {rows.map((pu) => (
              <div
                className="mobile-row-card"
                key={pu.id}
                onClick={() => setViewingId(pu.id)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{pu.name}</div>
                    <div className="text-xs text-gray-500">{pu.code}</div>
                  </div>
                  <span
                    className={`badge badge-${pu.is_active ? "green" : "gray"}`}
                  >
                    {pu.is_active ? "Active" : "Off"}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {pu.ward?.name}, {pu.ward?.lga?.name}
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs">
                    {pu.assigned_agent?.full_name || "Unassigned"}
                  </span>
                  <span className="text-xs font-semibold">
                    {pu.registered_count} / {pu.target_count}
                  </span>
                </div>
                <div
                  className="flex gap-2 mt-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="btn btn-sm btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setEditingPu(pu);
                      setShowForm(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    style={{ flex: 1 }}
                    onClick={() => handleDelete(pu)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pagination">
            {Array.from({ length: pagination.last_page || 1 }, (_, i) => (
              <button
                key={i}
                className={pagination.current_page === i + 1 ? "active" : ""}
                onClick={() => fetchRows(i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <PollingUnitFormModal
          editing={editingPu}
          defaultLga={lgaFilter}
          onClose={() => setShowForm(false)}
          onSaved={() => fetchRows(pagination.current_page || 1)}
        />
      )}
      {viewingId && (
        <PollingUnitDetailModal
          id={viewingId}
          onClose={() => setViewingId(null)}
        />
      )}
    </div>
  );
}
