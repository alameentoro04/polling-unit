import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";

const FIELD_TYPES = [
  "text",
  "number",
  "email",
  "tel",
  "date",
  "select",
  "textarea",
  "file",
];

export default function FormBuilder() {
  const { api } = useAuth();
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    label: "",
    key: "",
    type: "text",
    required: false,
    options: [],
    sort_order: 0,
    active: true,
    placeholder: "",
    help_text: "",
  });
  const [optionInput, setOptionInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    const res = await api.get("/form-fields/all");
    setFields(res.data);
    setLoading(false);
  };

  const resetForm = () => {
    setEditing(null);
    setForm({
      label: "",
      key: "",
      type: "text",
      required: false,
      options: [],
      sort_order: 0,
      active: true,
      placeholder: "",
      help_text: "",
    });
    setOptionInput("");
  };

  const handleSubmit = async () => {
    if (!form.label || !form.key) return alert("Label and Key are required");
    const payload = {
      ...form,
      options: form.type === "select" ? form.options : null,
    };
    setError("");
    try {
      if (editing) {
        await api.put(`/form-fields/${editing}`, payload);
      } else {
        await api.post("/form-fields", payload);
      }
      resetForm();
      fetchFields();
    } catch (e) {
      const serverErrors = e.response?.data?.errors;
      const message = serverErrors
        ? Object.values(serverErrors).flat().join(" ")
        : e.response?.data?.message ||
          "Couldn't save this field. Please try again.";
      setError(message);
    }
  };

  const handleEdit = (f) => {
    setEditing(f.id);
    setForm({ ...f, options: f.options || [] });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this field?")) return;
    await api.delete(`/form-fields/${id}`);
    fetchFields();
  };

  const addOption = () => {
    if (!optionInput.trim()) return;
    setForm((prev) => ({
      ...prev,
      options: [...prev.options, optionInput.trim()],
    }));
    setOptionInput("");
  };

  const removeOption = (idx) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== idx),
    }));
  };

  const moveField = async (id, direction) => {
    const idx = fields.findIndex((f) => f.id === id);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= fields.length) return;
    const newFields = [...fields];
    [newFields[idx], newFields[newIdx]] = [newFields[newIdx], newFields[idx]];
    const orders = newFields.map((f, i) => ({ id: f.id, sort_order: i }));
    await api.post("/form-fields/reorder", { orders });
    fetchFields();
  };

  if (loading) return <div className="text-center p-4">Loading...</div>;

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">Form Builder</h1>
      <p className="text-sm text-gray-500 mb-4">
        Customize the fields that appear on the agent registration form.
      </p>

      <div className="card mb-4">
        <div className="card-header">
          <div className="card-title">
            {editing ? "Edit Field" : "Add New Field"}
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          }}
        >
          <div>
            <label className="label">Field Label *</label>
            <input
              className="input"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="e.g. Occupation"
            />
          </div>
          <div>
            <label className="label">Field Key *</label>
            <input
              className="input"
              value={form.key}
              onChange={(e) =>
                setForm({
                  ...form,
                  key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                })
              }
              placeholder="e.g. occupation"
              disabled={!!editing}
            />
          </div>
          <div>
            <label className="label">Type</label>
            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Placeholder</label>
            <input
              className="input"
              value={form.placeholder}
              onChange={(e) =>
                setForm({ ...form, placeholder: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">Help Text</label>
            <input
              className="input"
              value={form.help_text}
              onChange={(e) => setForm({ ...form, help_text: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="req"
              checked={form.required}
              onChange={(e) => setForm({ ...form, required: e.target.checked })}
            />
            <label htmlFor="req" className="text-sm">
              Required
            </label>
            <input
              type="checkbox"
              id="act"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            <label htmlFor="act" className="text-sm">
              Active
            </label>
          </div>
        </div>

        {form.type === "select" && (
          <div className="mt-3">
            <label className="label">Options</label>
            <div className="flex gap-2 mb-2">
              <input
                className="input"
                value={optionInput}
                onChange={(e) => setOptionInput(e.target.value)}
                placeholder="Add option"
                onKeyDown={(e) => e.key === "Enter" && addOption()}
              />
              <button className="btn btn-secondary" onClick={addOption}>
                Add
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {form.options.map((opt, i) => (
                <span
                  key={i}
                  className="badge badge-blue flex items-center gap-1"
                >
                  {opt} <button onClick={() => removeOption(i)}>✕</button>
                </span>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div
            className="badge badge-red mb-3"
            style={{ width: "100%", justifyContent: "center" }}
          >
            {error}
          </div>
        )}

        <div className="flex gap-2 mt-3">
          <button className="btn btn-primary" onClick={handleSubmit}>
            {editing ? "Update Field" : "Add Field"}
          </button>
          {editing && (
            <button className="btn btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Label</th>
              <th>Key</th>
              <th>Type</th>
              <th>Required</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f, idx) => (
              <tr key={f.id}>
                <td>
                  <div className="flex gap-1">
                    <button
                      className="text-xs"
                      onClick={() => moveField(f.id, -1)}
                      disabled={idx === 0}
                    >
                      ▲
                    </button>
                    <button
                      className="text-xs"
                      onClick={() => moveField(f.id, 1)}
                      disabled={idx === fields.length - 1}
                    >
                      ▼
                    </button>
                  </div>
                </td>
                <td className="font-semibold">{f.label}</td>
                <td>
                  <code className="text-xs">{f.key}</code>
                </td>
                <td className="text-xs capitalize">{f.type}</td>
                <td>{f.required ? "Yes" : "No"}</td>
                <td>
                  <span
                    className={`badge badge-${f.active ? "green" : "gray"}`}
                  >
                    {f.active ? "Active" : "Hidden"}
                  </span>
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleEdit(f)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(f.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
