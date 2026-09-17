import { useEffect, useState } from "react";
import { Image, SlidersHorizontal, RotateCcw, Save } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const groupIcon = () => SlidersHorizontal;

export default function Settings() {
  const { api } = useAuth();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [activeTab, setActiveTab] = useState("branding");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const res = await api.get("/settings");
    setSettings(res.data);
    const firstGroup = Object.keys(res.data)[0];
    if (firstGroup) setActiveTab("branding");
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
    const flat = Object.values(settings).flat().map((s) => ({ key: s.key, value: s.value }));
    await api.post("/settings", { settings: flat });
    setSaving(false);
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    const formData = new FormData();
    formData.append("logo", logoFile);
    await api.post("/settings/logo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
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
          <select className="input" value={String(s.value)} onChange={(e) => handleChange(s.group, s.key, e.target.value === "true")}>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );
      case "color":
        return (
          <input type="color" className="input" value={s.value || "#0f4a2c"} onChange={(e) => handleChange(s.group, s.key, e.target.value)} style={{ height: 40, padding: 2 }} />
        );
      case "textarea":
        return <textarea className="input" rows={3} value={s.value || ""} onChange={(e) => handleChange(s.group, s.key, e.target.value)} />;
      default:
        return <input className="input" type={s.type === "number" ? "number" : "text"} value={s.value || ""} onChange={(e) => handleChange(s.group, s.key, e.target.value)} />;
    }
  };

  const tabs = ["branding", ...Object.keys(settings)];

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">System Settings</h1>

      <div className="settings-shell">
        <div className="settings-nav">
          {tabs.map((tab) => {
            const Icon = tab === "branding" ? Image : groupIcon();
            return (
              <button
                key={tab}
                className={`settings-nav-item ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                <Icon size={15} />
                {tab.replace(/_/g, " ")}
              </button>
            );
          })}
        </div>

        <div className="settings-panel">
          {activeTab === "branding" && (
            <div className="card">
              <div className="card-header"><div className="card-title">Logo & Branding</div></div>
              <div className="mb-3">
                <label className="label">Upload Logo</label>
                <input type="file" accept="image/*" className="input" onChange={(e) => setLogoFile(e.target.files[0])} />
              </div>
              <button className="btn btn-secondary" onClick={handleLogoUpload} disabled={!logoFile}>
                Upload Logo
              </button>
              {settings.branding?.find((s) => s.key === "logo_url")?.value && (
                <img src={settings.branding.find((s) => s.key === "logo_url").value} alt="Logo" style={{ height: 60, marginTop: 12 }} />
              )}

              {settings.branding?.filter((s) => s.key !== "logo_url").length > 0 && (
                <div className="settings-grid mt-3">
                  {settings.branding.filter((s) => s.key !== "logo_url").map((s) => (
                    <div key={s.key}>
                      <label className="label">{s.label}</label>
                      {renderInput(s)}
                      {s.help_text && <div className="text-xs text-gray-500 mt-1">{s.help_text}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab !== "branding" && settings[activeTab] && (
            <div className="card">
              <div className="card-header">
                <div className="card-title capitalize">{activeTab.replace(/_/g, " ")} Settings</div>
              </div>
              <div className="settings-grid">
                {settings[activeTab].map((s) => (
                  <div key={s.key}>
                    <label className="label">{s.label}</label>
                    {renderInput(s)}
                    {s.help_text && <div className="text-xs text-gray-500 mt-1">{s.help_text}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              <Save size={14} /> {saving ? "Saving..." : "Save All Settings"}
            </button>
            <button className="btn btn-secondary" onClick={handleReset}>
              <RotateCcw size={14} /> Reset Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
