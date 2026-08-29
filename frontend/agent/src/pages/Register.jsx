import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { storeRegistration } from "../services/db";
import { useNetwork } from "../hooks/useNetwork";
import { api } from "../hooks/useAuth";
import { compressImage } from "../services/image";

export default function Register() {
  const navigate = useNavigate();
  const isOnline = useNetwork();
  const [form, setForm] = useState({
    pvc_number: "",
    full_name: "",
    phone_number: "",
    date_of_birth: "",
    gender: "",
    photograph_url: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState("");
  const [gps, setGps] = useState(null);

  // Dynamic Fields State
  const [formFields, setFormFields] = useState([]);
  const [dynamicData, setDynamicData] = useState({});

  useEffect(() => {
    // Load form fields from API or cache
    api
      .get("/form-fields")
      .then((res) => setFormFields(res.data))
      .catch(() => {});
  }, []);

  const handleDynamicChange = (key, value) => {
    setDynamicData((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGps({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
    if (field === "pvc_number") {
      setDuplicateWarning("");
      checkDuplicate(value);
    }
  };

  const checkDuplicate = async (pvc) => {
    if (!pvc || pvc.length < 5 || !isOnline) return;
    try {
      const res = await api.get(`/agent/check-pvc`, { params: { pvc } });
      if (res.data.exists) {
        setDuplicateWarning("⚠️ This PVC may already exist. Please verify.");
      }
    } catch (e) {
      // Ignore network errors
    }
  };

  const validate = () => {
    const e = {};
    if (!form.pvc_number || form.pvc_number.length < 8)
      e.pvc_number = "PVC must be at least 8 characters";
    if (!form.full_name || form.full_name.length < 3)
      e.full_name = "Full name is required";
    if (form.phone_number && !/^0[0-9]{10}$/.test(form.phone_number))
      e.phone_number = "Invalid phone number";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      await storeRegistration({
        pvc_number: form.pvc_number.toUpperCase(),
        full_name: form.full_name,
        phone_number: form.phone_number,
        date_of_birth: form.date_of_birth,
        gender: form.gender,
        photograph_url: form.photograph_url,
        gps_latitude: gps?.latitude,
        gps_longitude: gps?.longitude,
        gps_accuracy: gps?.accuracy,
        registered_at: new Date().toISOString(),
        dynamic_data: dynamicData,
      });

      navigate("/");
    } catch (err) {
      setErrors({ submit: "Failed to save. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/")}
            style={{ color: "white", fontSize: "1.25rem" }}
          >
            ←
          </button>
          <div className="text-lg font-bold">Register Person</div>
        </div>
      </div>

      <div className="container">
        <form onSubmit={handleSubmit}>
          <div className="card">
            <div className="form-group">
              <label className="label">PVC Number *</label>
              <input
                className="input"
                value={form.pvc_number}
                onChange={(e) => handleChange("pvc_number", e.target.value)}
                placeholder="e.g. AB12345678"
                maxLength={20}
                style={{ textTransform: "uppercase" }}
              />
              {errors.pvc_number && (
                <div className="text-xs text-danger mt-1">
                  {errors.pvc_number}
                </div>
              )}
              {duplicateWarning && (
                <div className="text-xs text-warning mt-1">
                  {duplicateWarning}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="label">Full Name *</label>
              <input
                className="input"
                value={form.full_name}
                onChange={(e) => handleChange("full_name", e.target.value)}
                placeholder="Enter full name"
              />
              {errors.full_name && (
                <div className="text-xs text-danger mt-1">
                  {errors.full_name}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="label">Phone Number</label>
              <input
                className="input"
                value={form.phone_number}
                onChange={(e) => handleChange("phone_number", e.target.value)}
                placeholder="080XXXXXXXX"
                maxLength={11}
              />
              {errors.phone_number && (
                <div className="text-xs text-danger mt-1">
                  {errors.phone_number}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="label">Date of Birth</label>
              <input
                className="input"
                type="date"
                value={form.date_of_birth}
                onChange={(e) => handleChange("date_of_birth", e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="label">Gender</label>
              <select
                className="input"
                value={form.gender}
                onChange={(e) => handleChange("gender", e.target.value)}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="label">Photograph (Optional)</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="input"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  try {
                    const compressed = await compressImage(file, 800, 0.75);
                    handleChange("photograph_url", compressed);
                  } catch {
                    const reader = new FileReader();
                    reader.onload = (ev) =>
                      handleChange("photograph_url", ev.target.result);
                    reader.readAsDataURL(file);
                  }
                }}
              />
              {form.photograph_url && (
                <img
                  src={form.photograph_url}
                  alt="Preview"
                  className="mt-2 rounded-lg"
                  style={{ maxHeight: 120, width: "auto" }}
                />
              )}
            </div>
          </div>

          {/* this is where i added dynamic form fields */}
          {formFields.filter((f) => f.active).length > 0 && (
            <div className="card mt-3">
              {formFields
                .filter((f) => f.active)
                .map((field) => (
                  <div className="form-group" key={field.key}>
                    <label className="label">
                      {field.label}
                      {field.required && " *"}
                    </label>
                    {field.type === "select" ? (
                      <select
                        className="input"
                        value={dynamicData[field.key] || ""}
                        onChange={(e) =>
                          handleDynamicChange(field.key, e.target.value)
                        }
                        required={field.required}
                      >
                        <option value="">Select...</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "textarea" ? (
                      <textarea
                        className="input"
                        rows={3}
                        value={dynamicData[field.key] || ""}
                        onChange={(e) =>
                          handleDynamicChange(field.key, e.target.value)
                        }
                        placeholder={field.placeholder}
                        required={field.required}
                      />
                    ) : (
                      <input
                        className="input"
                        type={
                          field.type === "number"
                            ? "number"
                            : field.type === "date"
                            ? "date"
                            : "text"
                        }
                        value={dynamicData[field.key] || ""}
                        onChange={(e) =>
                          handleDynamicChange(field.key, e.target.value)
                        }
                        placeholder={field.placeholder}
                        required={field.required}
                      />
                    )}
                    {field.help_text && (
                      <div className="text-xs text-gray-500 mt-1">
                        {field.help_text}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}

          {errors.submit && (
            <div
              className="badge badge-red mb-3 mt-3"
              style={{ width: "100%", justifyContent: "center" }}
            >
              {errors.submit}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary mt-3"
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Save Registration"}
          </button>
        </form>
      </div>
    </div>
  );
}
