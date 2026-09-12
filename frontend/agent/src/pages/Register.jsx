import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  UserRound,
  Camera,
  ClipboardCheck,
  AlertCircle,
  Check,
} from "lucide-react";
import { storeRegistration, findLocalByPvc } from "../services/db";
import { useNetwork } from "../hooks/useNetwork";
import { api, useAuth } from "../hooks/useAuth";
import { compressImage } from "../services/image";

const STEPS = [
  { key: "location", label: "Location", icon: MapPin },
  { key: "person", label: "Person", icon: UserRound },
  { key: "photo", label: "Photo & Extra", icon: Camera },
  { key: "review", label: "Review", icon: ClipboardCheck },
];

function FieldError({ message }) {
  if (!message) return null;
  return (
    <div className="field-error">
      <AlertCircle size={12} /> {message}
    </div>
  );
}

function DuplicatePvcModal({ warning, onEdit, onContinue }) {
  if (!warning) return null;
  return (
    <div className="modal-backdrop" onClick={onEdit}>
      <motion.div
        className="modal-panel duplicate-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className="duplicate-modal-icon">
          <AlertCircle size={24} />
        </div>
        <div className="duplicate-modal-title">Possible Duplicate PVC</div>
        <div className="duplicate-modal-text">{warning}</div>
        <div className="duplicate-modal-actions">
          <button
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={onEdit}
          >
            Edit PVC
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={onContinue}
          >
            Continue Anyway
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const isOnline = useNetwork();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

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
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);
  const [gps, setGps] = useState(null);

  const [formFields, setFormFields] = useState([]);
  const [dynamicData, setDynamicData] = useState({});

  const [lgas, setLgas] = useState([]);
  const [wards, setWards] = useState([]);
  const [pollingUnits, setPollingUnits] = useState([]);
  const [location, setLocation] = useState(() => {
    try {
      const cached = localStorage.getItem("last_registration_location");
      return cached
        ? JSON.parse(cached)
        : { lga_id: "", ward_id: "", polling_unit_id: "" };
    } catch {
      return { lga_id: "", ward_id: "", polling_unit_id: "" };
    }
  });
  const [locationsLoading, setLocationsLoading] = useState(false);

  useEffect(() => {
    api
      .get("/lgas")
      .then((res) => setLgas(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?.assignment || location.lga_id) return;
    const { lga_id, ward_id, polling_unit_id } = user.assignment;
    setLocation({ lga_id, ward_id, polling_unit_id });
  }, [user]);

  useEffect(() => {
    if (!location.lga_id) return;
    setLocationsLoading(true);
    api
      .get(`/lgas/${location.lga_id}/wards`)
      .then((res) => setWards(res.data))
      .finally(() => setLocationsLoading(false));
  }, [location.lga_id]);

  useEffect(() => {
    if (!location.ward_id) {
      setPollingUnits([]);
      return;
    }
    setLocationsLoading(true);
    api
      .get(`/wards/${location.ward_id}/polling-units`)
      .then((res) => setPollingUnits(res.data))
      .finally(() => setLocationsLoading(false));
  }, [location.ward_id]);

  useEffect(() => {
    localStorage.setItem(
      "last_registration_location",
      JSON.stringify(location)
    );
  }, [location]);

  const handleLgaChange = (lga_id) =>
    setLocation({ lga_id, ward_id: "", polling_unit_id: "" });
  const handleWardChange = (ward_id) =>
    setLocation((l) => ({ ...l, ward_id, polling_unit_id: "" }));
  const handlePuChange = (polling_unit_id) =>
    setLocation((l) => ({ ...l, polling_unit_id }));

  useEffect(() => {
    api
      .get("/form-fields")
      .then((res) => setFormFields(res.data))
      .catch(() => {});
  }, []);

  const handleDynamicChange = (key, value) => {
    setDynamicData((prev) => ({ ...prev, [key]: value }));
    setErrors((e) => ({ ...e, [`dyn_${key}`]: "" }));
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setGps({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
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
      setDuplicateAcknowledged(false);
      checkDuplicate(value);
    }
  };

  const checkDuplicate = async (pvc) => {
    if (!pvc || pvc.length < 5) return;
    const localMatch = await findLocalByPvc(pvc);
    if (localMatch) {
      setDuplicateWarning(
        "You already registered this PVC on this device (not yet synced). Double-check this isn't the same person before continuing."
      );
      return;
    }
    if (!isOnline) return;
    try {
      const res = await api.get(`/agent/check-pvc`, { params: { pvc } });
      if (res.data.exists) {
        setDuplicateWarning(
          "This PVC number may already exist in the system. Please verify before continuing."
        );
      }
    } catch (e) {}
  };

  const validateStep = (stepIndex) => {
    const e = {};
    if (stepIndex === 1) {
      if (!form.pvc_number || form.pvc_number.length < 8)
        e.pvc_number = "PVC must be at least 8 characters";
      if (!form.full_name || form.full_name.length < 3)
        e.full_name = "Full name is required";
      if (form.phone_number && !/^0[0-9]{10}$/.test(form.phone_number))
        e.phone_number = "Enter a valid 11-digit phone number";
    }
    if (stepIndex === 2) {
      formFields
        .filter((f) => f.active && f.required)
        .forEach((f) => {
          if (!dynamicData[f.key]) e[`dyn_${f.key}`] = `${f.label} is required`;
        });
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    if (step === 1 && duplicateWarning && !duplicateAcknowledged) {
      return;
    }
    setDirection(1);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = async () => {
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
        polling_unit_id: location.polling_unit_id || null,
        ward_id: location.ward_id || null,
        lga_id: location.lga_id || null,
      });
      navigate("/");
    } catch (err) {
      setErrors({ submit: "Failed to save. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedLga = lgas.find(
    (l) => String(l.id) === String(location.lga_id)
  );
  const selectedWard = wards.find(
    (w) => String(w.id) === String(location.ward_id)
  );
  const selectedPu = pollingUnits.find(
    (p) => String(p.id) === String(location.polling_unit_id)
  );

  const variants = {
    enter: (dir) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => (step === 0 ? navigate("/") : goBack())}
            style={{ color: "white", fontSize: "1.25rem", display: "flex" }}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="text-lg font-bold">Register Person</div>
        </div>

        {/* Step indicator */}
        <div className="wizard-steps">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className={`wizard-step ${i === step ? "active" : ""} ${
                i < step ? "done" : ""
              }`}
            >
              <div className="wizard-step-dot">
                {i < step ? <Check size={12} /> : <s.icon size={12} />}
              </div>
              <span className="wizard-step-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="container">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Step 0: Location */}
            {step === 0 && (
              <div className="card">
                <div className="form-group">
                  <label className="label">Local Government Area</label>
                  <select
                    className="input"
                    value={location.lga_id}
                    onChange={(e) => handleLgaChange(e.target.value)}
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
                    value={location.ward_id}
                    onChange={(e) => handleWardChange(e.target.value)}
                    disabled={!location.lga_id}
                  >
                    <option value="">Select Ward...</option>
                    {wards.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="label">Polling Unit</label>
                  <select
                    className="input"
                    value={location.polling_unit_id}
                    onChange={(e) => handlePuChange(e.target.value)}
                    disabled={!location.ward_id}
                  >
                    <option value="">Select Polling Unit...</option>
                    {pollingUnits.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {locationsLoading && (
                    <div className="text-xs text-gray-500 mt-1">Loading…</div>
                  )}
                  {user?.assignment &&
                    location.polling_unit_id !==
                      String(user.assignment.polling_unit_id) && (
                      <div className="text-xs text-warning mt-1">
                        ⚠️ Different from your assigned polling unit (
                        {user.assignment.polling_unit_name}).
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Step 1: Person details */}
            {step === 1 && (
              <div className="card">
                <div className="form-group">
                  <label className="label">PVC Number *</label>
                  <input
                    className={`input ${
                      errors.pvc_number ? "input-error" : ""
                    }`}
                    value={form.pvc_number}
                    onChange={(e) => handleChange("pvc_number", e.target.value)}
                    placeholder="e.g. AB12345678"
                    maxLength={20}
                    style={{ textTransform: "uppercase" }}
                  />
                  <FieldError message={errors.pvc_number} />
                </div>

                <div className="form-group">
                  <label className="label">Full Name *</label>
                  <input
                    className={`input ${errors.full_name ? "input-error" : ""}`}
                    value={form.full_name}
                    onChange={(e) => handleChange("full_name", e.target.value)}
                    placeholder="Enter full name"
                  />
                  <FieldError message={errors.full_name} />
                </div>

                <div className="form-group">
                  <label className="label">Phone Number</label>
                  <input
                    className={`input ${
                      errors.phone_number ? "input-error" : ""
                    }`}
                    value={form.phone_number}
                    onChange={(e) =>
                      handleChange("phone_number", e.target.value)
                    }
                    placeholder="080XXXXXXXX"
                    maxLength={11}
                  />
                  <FieldError message={errors.phone_number} />
                </div>

                <div className="form-group">
                  <label className="label">Date of Birth</label>
                  <input
                    className="input"
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) =>
                      handleChange("date_of_birth", e.target.value)
                    }
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
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
              </div>
            )}

            {/* Step 2: Photo + dynamic fields */}
            {step === 2 && (
              <>
                <div className="card">
                  <div className="form-group" style={{ marginBottom: 0 }}>
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
                          const compressed = await compressImage(
                            file,
                            800,
                            0.75
                          );
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
                        style={{ maxHeight: 140, width: "auto" }}
                      />
                    )}
                  </div>
                </div>

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
                              className={`input ${
                                errors[`dyn_${field.key}`] ? "input-error" : ""
                              }`}
                              value={dynamicData[field.key] || ""}
                              onChange={(e) =>
                                handleDynamicChange(field.key, e.target.value)
                              }
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
                              className={`input ${
                                errors[`dyn_${field.key}`] ? "input-error" : ""
                              }`}
                              rows={3}
                              value={dynamicData[field.key] || ""}
                              onChange={(e) =>
                                handleDynamicChange(field.key, e.target.value)
                              }
                              placeholder={field.placeholder}
                            />
                          ) : (
                            <input
                              className={`input ${
                                errors[`dyn_${field.key}`] ? "input-error" : ""
                              }`}
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
                            />
                          )}
                          <FieldError message={errors[`dyn_${field.key}`]} />
                          {field.help_text && (
                            <div className="text-xs text-gray-500 mt-1">
                              {field.help_text}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div className="card">
                <div className="text-xs text-gray-500 uppercase font-semibold mb-2">
                  Location
                </div>
                <dl className="mb-3">
                  <div className="detail-row">
                    <dt>LGA</dt>
                    <dd>{selectedLga?.name || "—"}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>Ward</dt>
                    <dd>{selectedWard?.name || "—"}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>Polling Unit</dt>
                    <dd>{selectedPu?.name || "—"}</dd>
                  </div>
                </dl>
                <div className="text-xs text-gray-500 uppercase font-semibold mb-2">
                  Person
                </div>
                <dl className="mb-3">
                  <div className="detail-row">
                    <dt>PVC Number</dt>
                    <dd>{form.pvc_number.toUpperCase()}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>Full Name</dt>
                    <dd>{form.full_name}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>Phone</dt>
                    <dd>{form.phone_number || "—"}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>Date of Birth</dt>
                    <dd>{form.date_of_birth || "—"}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>Gender</dt>
                    <dd className="capitalize">{form.gender || "—"}</dd>
                  </div>
                </dl>
                {form.photograph_url && (
                  <img
                    src={form.photograph_url}
                    alt="Preview"
                    className="rounded-lg mb-3"
                    style={{ maxHeight: 140, width: "auto" }}
                  />
                )}
                {Object.keys(dynamicData).length > 0 && (
                  <>
                    <div className="text-xs text-gray-500 uppercase font-semibold mb-2">
                      Additional Info
                    </div>
                    <dl>
                      {Object.entries(dynamicData).map(([k, v]) => (
                        <div className="detail-row" key={k}>
                          <dt>{k.replace(/_/g, " ")}</dt>
                          <dd>{v || "—"}</dd>
                        </div>
                      ))}
                    </dl>
                  </>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {errors.submit && (
          <div
            className="badge badge-red mb-3 mt-3"
            style={{ width: "100%", justifyContent: "center" }}
          >
            {errors.submit}
          </div>
        )}

        <div className="wizard-nav">
          {step > 0 && (
            <button
              className="btn btn-secondary"
              onClick={goBack}
              style={{ flex: 1 }}
            >
              <ArrowLeft size={16} /> Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              className="btn btn-primary"
              onClick={goNext}
              style={{ flex: 2 }}
            >
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting}
              style={{ flex: 2 }}
            >
              {submitting ? "Saving..." : "Save Registration"}
            </button>
          )}
        </div>
      </div>

      <DuplicatePvcModal
        warning={
          step === 1 && duplicateWarning && !duplicateAcknowledged
            ? duplicateWarning
            : null
        }
        onEdit={() => setDuplicateWarning("")}
        onContinue={() => {
          setDuplicateAcknowledged(true);
        }}
      />
    </div>
  );
}
