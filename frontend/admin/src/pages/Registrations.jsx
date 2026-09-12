import { useEffect, useState } from "react";
import {
  Search,
  Download,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  Phone,
  Calendar,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useLocations } from "../hooks/useLocations";
import Drawer from "../components/Drawer";
import SkeletonTable from "../components/SkeletonTable";
import EmptyState from "../components/EmptyState";

const statusMeta = {
  synced: { badge: "green", icon: CheckCircle2, label: "Synced" },
  pending: { badge: "yellow", icon: Clock, label: "Pending" },
  syncing: { badge: "yellow", icon: Clock, label: "Syncing" },
  conflict: { badge: "red", icon: AlertTriangle, label: "Conflict" },
  failed: { badge: "red", icon: AlertTriangle, label: "Failed" },
};

function RegistrationDrawer({ id, onClose }) {
  const { api } = useAuth();
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setRecord(null);
    api
      .get(`/registrations/${id}`)
      .then((res) => setRecord(res.data))
      .catch(() => setError("Couldn't load this record."));
  }, [id, api]);

  const status = statusMeta[record?.sync_status] || statusMeta.pending;
  const StatusIcon = status.icon;

  return (
    <Drawer open={!!id} onClose={onClose} title="Registration Details">
      {error && <div className="text-sm text-danger">{error}</div>}
      {!record && !error && <SkeletonTable rows={3} columns={1} />}

      {record && (
        <>
          {record.photograph_url ? (
            <img
              src={record.photograph_url}
              alt={record.full_name}
              className="drawer-photo"
            />
          ) : (
            <div className="drawer-photo drawer-photo-placeholder">
              <UserIcon size={32} />
            </div>
          )}

          <div className="drawer-name-row">
            <div>
              <div className="drawer-person-name">{record.full_name}</div>
              <div className="text-xs text-gray-500">{record.pvc_number}</div>
            </div>
            <span
              className={`badge badge-${status.badge}`}
              style={{ display: "flex", gap: "0.25rem" }}
            >
              <StatusIcon size={12} /> {status.label}
            </span>
          </div>

          <dl className="mt-3">
            <div className="detail-row">
              <dt>
                <Phone
                  size={12}
                  style={{ display: "inline", marginRight: 4 }}
                />
                Phone
              </dt>
              <dd>{record.phone_number || "—"}</dd>
            </div>
            <div className="detail-row">
              <dt>
                <Calendar
                  size={12}
                  style={{ display: "inline", marginRight: 4 }}
                />
                Date of Birth
              </dt>
              <dd>{record.date_of_birth || "—"}</dd>
            </div>
            <div className="detail-row">
              <dt>Gender</dt>
              <dd className="capitalize">{record.gender || "—"}</dd>
            </div>
            <div className="detail-row">
              <dt>
                <MapPin
                  size={12}
                  style={{ display: "inline", marginRight: 4 }}
                />
                Polling Unit
              </dt>
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
    </Drawer>
  );
}

export default function Registrations() {
  const { api, user } = useAuth();
  const { lgas, wards, pollingUnits, loadWards, loadPollingUnits } =
    useLocations();
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
  }, [
    filters.lga_id,
    filters.ward_id,
    filters.polling_unit_id,
    filters.date_from,
    filters.date_to,
  ]);

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

  const handleDelete = async (e, id) => {
    e.stopPropagation();
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
          <div className="input-icon-wrap">
            <Search size={14} className="input-icon" />
            <input
              className="input"
              style={{ paddingLeft: "2rem" }}
              placeholder="Search PVC, name, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>

        <select
          className="select"
          value={filters.lga_id}
          onChange={(e) => {
            const val = e.target.value;
            setFilters((f) => ({
              ...f,
              lga_id: val,
              ward_id: "",
              polling_unit_id: "",
            }));
            loadWards(val);
          }}
        >
          <option value="">All LGAs</option>
          {lgas.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>

        {filters.lga_id && (
          <select
            className="select"
            value={filters.ward_id}
            onChange={(e) => {
              const val = e.target.value;
              setFilters((f) => ({ ...f, ward_id: val, polling_unit_id: "" }));
              loadPollingUnits(val);
            }}
          >
            <option value="">All Wards</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        )}

        {filters.ward_id && (
          <select
            className="select"
            value={filters.polling_unit_id}
            onChange={(e) =>
              setFilters((f) => ({ ...f, polling_unit_id: e.target.value }))
            }
          >
            <option value="">All Polling Units</option>
            {pollingUnits.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}

        <input
          className="input"
          type="date"
          value={filters.date_from}
          onChange={(e) =>
            setFilters((f) => ({ ...f, date_from: e.target.value }))
          }
        />
        <input
          className="input"
          type="date"
          value={filters.date_to}
          onChange={(e) =>
            setFilters((f) => ({ ...f, date_to: e.target.value }))
          }
        />

        <button className="btn btn-secondary" onClick={() => fetchRecords(1)}>
          <RefreshCw size={14} /> Refresh
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleExport}
          disabled={exporting}
        >
          <Download size={14} /> {exporting ? "Exporting…" : "Export Excel"}
        </button>
      </div>

      {exportError && <div className="badge badge-red mb-3">{exportError}</div>}

      {loading ? (
        <SkeletonTable rows={8} columns={7} />
      ) : records.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Search}
            title="No registrations found"
            description="Try adjusting your search or filters."
          />
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="data-table-wrap">
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
                {records.map((r) => {
                  const status =
                    statusMeta[r.sync_status] || statusMeta.pending;
                  const StatusIcon = status.icon;
                  return (
                    <tr key={r.id} onClick={() => setViewingId(r.id)}>
                      <td className="font-semibold">{r.pvc_number}</td>
                      <td>{r.full_name}</td>
                      <td>{r.phone_number}</td>
                      <td>{r.polling_unit?.name}</td>
                      <td>{r.registered_by?.full_name}</td>
                      <td>{new Date(r.registered_at).toLocaleDateString()}</td>
                      <td>
                        <span
                          className={`badge badge-${status.badge}`}
                          style={{ display: "inline-flex", gap: "0.25rem" }}
                        >
                          <StatusIcon size={11} /> {status.label}
                        </span>
                      </td>
                      {user?.role === "admin" && (
                        <td>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={(e) => handleDelete(e, r.id)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
        </div>
      )}

      <RegistrationDrawer id={viewingId} onClose={() => setViewingId(null)} />
    </div>
  );
}
