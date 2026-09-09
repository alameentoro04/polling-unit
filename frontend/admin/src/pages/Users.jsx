import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useLocations } from "../hooks/useLocations";

const ROLES = [
  { value: "admin", label: "Administrator" },
  { value: "lga_coordinator", label: "LGA Coordinator" },
  { value: "ward_coordinator", label: "Ward Coordinator" },
  { value: "agent", label: "Polling Unit Agent" },
];

const emptyForm = {
  full_name: "",
  username: "",
  password: "",
  email: "",
  phone: "",
  role: "agent",
  lga_id: "",
  ward_id: "",
};

function CreateUserModal({ onClose, onCreated }) {
  const { api } = useAuth();
  const { lgas, wards, loadWards } = useLocations();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      await api.post("/users", form);
      onCreated();
      onClose();
    } catch (err) {
      setErrors(
        err.response?.data?.errors || {
          _: [err.response?.data?.message || "Failed to create user"],
        }
      );
    } finally {
      setSubmitting(false);
    }
  };

  const fieldError = (field) => errors[field]?.[0];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="card-title">Add User</div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {errors._ && (
            <div className="badge badge-red mb-3">{errors._[0]}</div>
          )}

          <div className="form-group">
            <label className="label">Full Name *</label>
            <input
              className="input"
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
              required
            />
            {fieldError("full_name") && (
              <div className="text-xs text-danger">
                {fieldError("full_name")}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="label">Username *</label>
            <input
              className="input"
              value={form.username}
              onChange={(e) => set("username", e.target.value)}
              required
            />
            {fieldError("username") && (
              <div className="text-xs text-danger">
                {fieldError("username")}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="label">Password *</label>
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              required
              minLength={8}
            />
            {fieldError("password") && (
              <div className="text-xs text-danger">
                {fieldError("password")}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="label">Phone</label>
            <input
              className="input"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="label">Role *</label>
            <select
              className="input"
              value={form.role}
              onChange={(e) => set("role", e.target.value)}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {form.role === "lga_coordinator" && (
            <div className="form-group">
              <label className="label">LGA *</label>
              <select
                className="input"
                value={form.lga_id}
                onChange={(e) => set("lga_id", e.target.value)}
                required
              >
                <option value="">Select LGA...</option>
                {lgas.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              {fieldError("lga_id") && (
                <div className="text-xs text-danger">
                  {fieldError("lga_id")}
                </div>
              )}
            </div>
          )}

          {form.role === "ward_coordinator" && (
            <>
              <div className="form-group">
                <label className="label">LGA *</label>
                <select
                  className="input"
                  value={form.lga_id}
                  onChange={(e) => {
                    set("lga_id", e.target.value);
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
                  disabled={!form.lga_id}
                >
                  <option value="">Select Ward...</option>
                  {wards.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                {fieldError("ward_id") && (
                  <div className="text-xs text-danger">
                    {fieldError("ward_id")}
                  </div>
                )}
              </div>
            </>
          )}

          {form.role === "agent" && (
            <div className="text-xs text-gray-500 mb-3">
              Agents are assigned to a polling unit as a separate step, after
              being created — use the "Assign" button on their row.
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={submitting}
          >
            {submitting ? "Creating..." : "Create User"}
          </button>
        </form>
      </div>
    </div>
  );
}

function AssignAgentModal({ user, onClose, onAssigned }) {
  const { api } = useAuth();
  const { lgas, wards, pollingUnits, loadWards, loadPollingUnits } =
    useLocations();
  const [lgaId, setLgaId] = useState("");
  const [wardId, setWardId] = useState("");
  const [puId, setPuId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleAssign = async () => {
    if (!puId) return;
    setSubmitting(true);
    setError("");
    try {
      const endpoint = user.assigned_polling_unit_id ? "reassign" : "assign";
      await api.post(`/users/${user.id}/${endpoint}`, {
        polling_unit_id: puId,
      });
      onAssigned();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to assign polling unit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="card-title">
            {user.assigned_polling_unit_id ? "Reassign" : "Assign"}{" "}
            {user.full_name}
          </div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <div className="badge badge-red mb-3">{error}</div>}

        {user.assigned_polling_unit?.name && (
          <div className="text-xs text-gray-500 mb-3">
            Currently assigned to:{" "}
            <strong>{user.assigned_polling_unit.name}</strong> (
            {user.assigned_polling_unit.ward?.name},{" "}
            {user.assigned_polling_unit.ward?.lga?.name})
          </div>
        )}

        <div className="form-group">
          <label className="label">LGA</label>
          <select
            className="input"
            value={lgaId}
            onChange={(e) => {
              setLgaId(e.target.value);
              setWardId("");
              setPuId("");
              loadWards(e.target.value);
            }}
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
          <label className="label">Ward</label>
          <select
            className="input"
            value={wardId}
            disabled={!lgaId}
            onChange={(e) => {
              setWardId(e.target.value);
              setPuId("");
              loadPollingUnits(e.target.value);
            }}
          >
            <option value="">Select Ward...</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="label">Polling Unit</label>
          <select
            className="input"
            value={puId}
            disabled={!wardId}
            onChange={(e) => setPuId(e.target.value)}
          >
            <option value="">Select Polling Unit...</option>
            {pollingUnits.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <button
          className="btn btn-primary w-full"
          onClick={handleAssign}
          disabled={!puId || submitting}
        >
          {submitting ? "Saving..." : "Confirm Assignment"}
        </button>
      </div>
    </div>
  );
}

export default function Users() {
  const { api } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [assigning, setAssigning] = useState(null);
  const [roleFilter, setRoleFilter] = useState("");

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    const params = roleFilter ? `?role=${roleFilter}` : "";
    const res = await api.get(`/users${params}`);
    setUsers(res.data.data);
    setLoading(false);
  };

  const handleDeactivate = async (id) => {
    if (!confirm("Deactivate this user?")) return;
    await api.post(`/users/${id}/deactivate`);
    fetchUsers();
  };

  const scopeLabel = (u) => {
    if (u.role?.name === "agent")
      return u.assigned_polling_unit?.name || "Not assigned";
    if (u.role?.name === "lga_coordinator") return u.managed_lga?.name || "—";
    if (u.role?.name === "ward_coordinator") return u.managed_ward?.name || "—";
    return "Statewide";
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-bold">User Management</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + Add User
        </button>
      </div>

      <div className="filters-bar mb-3">
        <select
          className="select"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        {loading ? (
          <div className="text-center p-4">Loading...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Scope / Assignment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.full_name}</td>
                  <td>{u.username}</td>
                  <td className="capitalize">
                    {u.role?.name?.replace("_", " ")}
                  </td>
                  <td className="text-sm text-gray-600">{scopeLabel(u)}</td>
                  <td>
                    <span
                      className={`badge badge-${u.is_active ? "green" : "red"}`}
                    >
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="flex gap-2">
                    {u.role?.name === "agent" && u.is_active && (
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => setAssigning(u)}
                      >
                        {u.assigned_polling_unit_id ? "Reassign" : "Assign"}
                      </button>
                    )}
                    {u.is_active && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeactivate(u.id)}
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchUsers}
        />
      )}
      {assigning && (
        <AssignAgentModal
          user={assigning}
          onClose={() => setAssigning(null)}
          onAssigned={fetchUsers}
        />
      )}
    </div>
  );
}
