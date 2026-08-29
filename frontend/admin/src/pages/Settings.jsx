import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function Settings() {
  const { api } = useAuth();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const res = await api.get("/settings");
    setSettings(res.data);
    setLoading(false);
  };

  const handleChange = (group, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [group]: prev[group].map((s) => (s.key === key ? { ...s, value } : s)),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const flat = Object.values(settings)
      .flat()
      .map((s) => ({ key: s.key, value: s.value }));
    await api.post("/settings", { settings: flat });
    setSaving(false);
    alert("Settings saved");
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    const formData = new FormData();
    formData.append("logo", logoFile);
    const res = await api.post("/settings/logo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    alert("Logo uploaded");
    setLogoFile(null);
    fetchSettings();
  };

  const handleReset = async () => {
    if (!confirm("Reset all settings to defaults?")) return;
    await api.post("/settings/reset");
    fetchSettings();
  };

  if (loading) return <div className="text-center p-4">Loading...</div>;

  const renderInput = (s) => {
    switch (s.type) {
      case "boolean":
        return (
          <select
            className="input"
            value={String(s.value)}
            onChange={(e) =>
              handleChange(s.group, s.key, e.target.value === "true")
            }
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );
      case "color":
        return (
          <input
            type="color"
            className="input"
            value={s.value || "#1a5f2a"}
            onChange={(e) => handleChange(s.group, s.key, e.target.value)}
            style={{ height: 40, padding: 2 }}
          />
        );
      case "textarea":
        return (
          <textarea
            className="input"
            rows={3}
            value={s.value || ""}
            onChange={(e) => handleChange(s.group, s.key, e.target.value)}
          />
        );
      default:
        return (
          <input
            className="input"
            type={s.type === "number" ? "number" : "text"}
            value={s.value || ""}
            onChange={(e) => handleChange(s.group, s.key, e.target.value)}
          />
        );
    }
  };

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">System Settings</h1>

      <div className="card mb-4">
        <div className="card-header">
          <div className="card-title">Logo & Branding</div>
        </div>
        <div className="mb-3">
          <label className="label">Upload Logo</label>
          <input
            type="file"
            accept="image/*"
            className="input"
            onChange={(e) => setLogoFile(e.target.files[0])}
          />
        </div>
        <button
          className="btn btn-secondary"
          onClick={handleLogoUpload}
          disabled={!logoFile}
        >
          Upload Logo
        </button>
        {settings.branding?.find((s) => s.key === "logo_url")?.value && (
          <img
            src={settings.branding.find((s) => s.key === "logo_url").value}
            alt="Logo"
            style={{ height: 60, marginTop: 12 }}
          />
        )}
      </div>

      {Object.entries(settings).map(([group, items]) => (
        <div key={group} className="card mb-4">
          <div className="card-header">
            <div className="card-title capitalize">
              {group.replace("_", " ")} Settings
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            }}
          >
            {items.map((s) => (
              <div key={s.key}>
                <label className="label">{s.label}</label>
                {renderInput(s)}
                {s.help_text && (
                  <div className="text-xs text-gray-500 mt-1">
                    {s.help_text}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save All Settings"}
        </button>
        <button className="btn btn-secondary" onClick={handleReset}>
          Reset Defaults
        </button>
      </div>
    </div>
  );
}
