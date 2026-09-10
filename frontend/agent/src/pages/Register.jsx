import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { storeRegistration, findLocalByPvc } from "../services/db";
import { useNetwork } from "../hooks/useNetwork";
import { api } from "../hooks/useAuth";
import { compressImage } from "../services/image";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  User,
  IdCard,
  Camera,
  ListPlus,
  ClipboardCheck,
  AlertTriangle,
  RotateCcw,
  Trash2,
} from "lucide-react";

const DRAFT_KEY = "agent_register_draft";

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function Register() {
  const navigate = useNavigate();
  const isOnline = useNetwork();
  const [form, setForm] = useState(
    () =>
      loadDraft()?.form || {
        pvc_number: "",
        full_name: "",
        phone_number: "",
        date_of_birth: "",
        gender: "",
        photograph_url: "",
      }
  );
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState("");
  const [gps, setGps] = useState(null);

  const [formFields, setFormFields] = useState([]);
  const [fieldsLoaded, setFieldsLoaded] = useState(false);
  const [dynamicData, setDynamicData] = useState(
    () => loadDraft()?.dynamicData || {}
  );
  const [stepIndex, setStepIndex] = useState(() => loadDraft()?.stepIndex || 0);
  const [draftBannerVisible, setDraftBannerVisible] = useState(
    () => !!loadDraft()
  );

  useEffect(() => {
    api
      .get("/form-fields")
      .then((res) => setFormFields(res.data))
      .catch(() => {})
      .finally(() => setFieldsLoaded(true));
  }, []);

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

  const activeFields = formFields.filter((f) => f.active);

  const steps = useMemo(() => {
    const base = [
      { id: "personal", label: "Personal", icon: User },
      { id: "pvc", label: "Voter ID", icon: IdCard },
      { id: "photo", label: "Photo", icon: Camera },
    ];
    if (activeFields.length > 0) {
      base.push({ id: "extra", label: "More Info", icon: ListPlus });
    }
    base.push({ id: "review", label: "Review", icon: ClipboardCheck });
    return base;
  }, [activeFields.length]);

  const currentStep = steps[stepIndex];

  useEffect(() => {
    if (fieldsLoaded && stepIndex > steps.length - 1) {
      setStepIndex(steps.length - 1);
    }
  }, [fieldsLoaded, steps.length, stepIndex]);

  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ form, dynamicData, stepIndex })
      );
    } catch {}
  }, [form, dynamicData, stepIndex]);

  const discardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setForm({
      pvc_number: "",
      full_name: "",
      phone_number: "",
      date_of_birth: "",
      gender: "",
      photograph_url: "",
    });
    setDynamicData({});
    setStepIndex(0);
    setDraftBannerVisible(false);
  };

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
    if (field === "pvc_number") {
      setDuplicateWarning("");
      checkDuplicate(value);
    }
  };

  const handleDynamicChange = (key, value) => {
    setDynamicData((prev) => ({ ...prev, [key]: value }));
    setErrors((e) => ({ ...e, [`dyn_${key}`]: "" }));
  };

  const checkDuplicate = async (pvc) => {
    if (!pvc || pvc.length < 5) return;

    const localMatch = await findLocalByPvc(pvc);
    if (localMatch) {
      setDuplicateWarning(
        "You already registered this PVC on this device (not yet synced)."
      );
      return;
    }

    if (!isOnline) return;
    try {
      const res = await api.get(`/agent/check-pvc`, { params: { pvc } });
      if (res.data.exists) {
        setDuplicateWarning("This PVC may already exist. Please verify.");
      }
    } catch (e) {}
  };

  const validateStep = (stepId) => {
    const e = {};
    if (stepId === "personal") {
      if (!form.full_name || form.full_name.length < 3)
        e.full_name = "Full name is required";
      if (form.phone_number && !/^0[0-9]{10}$/.test(form.phone_number))
        e.phone_number = "Invalid phone number";
    }
    if (stepId === "pvc") {
      if (!form.pvc_number || form.pvc_number.length < 8)
        e.pvc_number = "PVC must be at least 8 characters";
    }
    if (stepId === "extra") {
      activeFields
        .filter((f) => f.required)
        .forEach((f) => {
          if (!dynamicData[f.key]) e[`dyn_${f.key}`] = "This field is required";
        });
    }
    setErrors((prev) => ({ ...prev, ...e }));
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if (!validateStep(currentStep.id)) return;
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const goBack = () => {
    if (stepIndex === 0) {
      navigate("/");
    } else {
      setStepIndex((i) => i - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError("");
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
      localStorage.removeItem(DRAFT_KEY);
      navigate("/");
    } catch (err) {
      setSubmitError("Failed to save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 800, 0.75);
      handleChange("photograph_url", compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => handleChange("photograph_url", ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  if (!fieldsLoaded) {
    return (
      <div className="min-h-screen bg-[#f6f8f6]">
        <div className="mx-auto max-w-md px-4 pb-6 pt-6">
          <div className="mb-5 h-10 w-40 animate-pulse rounded-full bg-gray-200" />
          <div className="mb-6 h-9 w-full animate-pulse rounded-full bg-gray-200" />
          <div className="h-64 animate-pulse rounded-3xl bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f8f6]">
      <div className="mx-auto max-w-md px-4 pb-6 pt-6">
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <button
            onClick={goBack}
            aria-label="Back"
            className="tap-scale flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
          >
            <ArrowLeft size={18} className="text-[#1f2937]" />
          </button>
          <div>
            <div className="text-lg font-bold text-[#1f2937]">
              Register Person
            </div>
            <div className="text-xs text-[#6b7280]">
              Step {stepIndex + 1} of {steps.length}
            </div>
          </div>
        </div>

        {draftBannerVisible && (
          <div className="animate-fade-slide-up mb-4 flex items-center justify-between gap-2 rounded-2xl bg-[#eaf3ec] px-4 py-2.5 text-xs font-medium text-[#124a1f]">
            <span>Continuing your saved draft</span>
            <button
              onClick={discardDraft}
              className="tap-scale flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-red-600 shadow-sm"
            >
              <Trash2 size={14} />
              Discard
            </button>
          </div>
        )}

        {/* Stepper progress */}
        <div className="mb-6 flex items-center px-5">
          {steps.flatMap((step, i) => {
            const StepIcon = step.icon;
            const done = i < stepIndex;
            const active = i === stepIndex;

            const nodes = [
              <div key={step.id} className="flex shrink-0 flex-col items-center gap-1">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-colors ${
                    done || active ? "bg-[#1a5f2a]" : "bg-gray-200"
                  }`}
                >
                  {done ? (
                    <Check size={16} />
                  ) : (
                    <StepIcon
                      size={15}
                      className={active ? "text-white" : "text-gray-500"}
                    />
                  )}
                </div>
                <span
                  className={`text-[10px] font-medium ${
                    active ? "text-[#1a5f2a]" : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>,
            ];

            if (i < steps.length - 1) {
              nodes.push(
                <div
                  key={`line-${step.id}`}
                  className={`mx-1 h-0.5 flex-1 rounded-full transition-colors ${
                    done ? "bg-[#1a5f2a]" : "bg-gray-200"
                  }`}
                  style={{ marginBottom: "16px" }}
                />
              );
            }

            return nodes;
          })}
        </div>

        {/* Step content */}
        <div
          key={currentStep.id}
          className="glass-panel-light animate-fade-slide-up mb-5 rounded-3xl p-5"
        >
          {currentStep.id === "personal" && (
            <div className="space-y-4">
              <Field label="Full Name *" error={errors.full_name}>
                <input
                  className="field-input"
                  value={form.full_name}
                  onChange={(e) => handleChange("full_name", e.target.value)}
                  placeholder="Enter full name"
                />
              </Field>
              <Field label="Phone Number" error={errors.phone_number}>
                <input
                  className="field-input"
                  value={form.phone_number}
                  onChange={(e) =>
                    handleChange("phone_number", e.target.value)
                  }
                  placeholder="080XXXXXXXX"
                  maxLength={11}
                />
              </Field>
              <Field label="Date of Birth">
                <input
                  type="date"
                  className="field-input"
                  value={form.date_of_birth}
                  onChange={(e) =>
                    handleChange("date_of_birth", e.target.value)
                  }
                />
              </Field>
              <Field label="Gender">
                <select
                  className="field-input"
                  value={form.gender}
                  onChange={(e) => handleChange("gender", e.target.value)}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </Field>
            </div>
          )}

          {currentStep.id === "pvc" && (
            <div className="space-y-2">
              <Field label="PVC Number *" error={errors.pvc_number}>
                <input
                  className="field-input uppercase"
                  value={form.pvc_number}
                  onChange={(e) =>
                    handleChange("pvc_number", e.target.value)
                  }
                  placeholder="e.g. AB12345678"
                  maxLength={20}
                />
              </Field>
              {duplicateWarning && (
                <div className="flex items-start gap-2 rounded-xl bg-yellow-50 px-3 py-2.5 text-xs font-medium text-yellow-800">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  {duplicateWarning}
                </div>
              )}
            </div>
          )}

          {currentStep.id === "photo" && (
            <div>
              <div className="mb-3 text-sm font-semibold text-[#1f2937]">
                Photograph (Optional)
              </div>
              {form.photograph_url ? (
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={form.photograph_url}
                    alt="Preview"
                    className="h-48 w-48 rounded-2xl object-cover shadow-sm"
                  />
                  <label className="tap-scale flex cursor-pointer items-center gap-2 rounded-xl border border-[#d8e6db] px-4 py-2 text-sm font-semibold text-[#1a5f2a]">
                    <RotateCcw size={15} />
                    Retake
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handlePhoto}
                    />
                  </label>
                </div>
              ) : (
                <label className="tap-scale flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#c7dccb] py-10 text-[#1a5f2a]">
                  <Camera size={28} />
                  <span className="text-sm font-semibold">Take a photo</span>
                  <span className="text-xs text-[#6b7280]">
                    Optional, but recommended
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhoto}
                  />
                </label>
              )}
            </div>
          )}

          {currentStep.id === "extra" && (
            <div className="space-y-4">
              {activeFields.map((field) => (
                <Field
                  key={field.key}
                  label={`${field.label}${field.required ? " *" : ""}`}
                  error={errors[`dyn_${field.key}`]}
                  help={field.help_text}
                >
                  {field.type === "select" ? (
                    <select
                      className="field-input"
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
                      className="field-input"
                      rows={3}
                      value={dynamicData[field.key] || ""}
                      onChange={(e) =>
                        handleDynamicChange(field.key, e.target.value)
                      }
                      placeholder={field.placeholder}
                    />
                  ) : (
                    <input
                      className="field-input"
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
                </Field>
              ))}
            </div>
          )}

          {currentStep.id === "review" && (
            <div className="space-y-4">
              <div className="text-sm font-semibold text-[#1f2937]">
                Review before submitting
              </div>

              {form.photograph_url && (
                <img
                  src={form.photograph_url}
                  alt="Preview"
                  className="mx-auto h-28 w-28 rounded-2xl object-cover shadow-sm"
                />
              )}

              <div className="divide-y divide-gray-100 rounded-2xl bg-[#f6f8f6]">
                <ReviewRow label="Full Name" value={form.full_name} />
                <ReviewRow label="PVC Number" value={form.pvc_number.toUpperCase()} />
                <ReviewRow label="Phone" value={form.phone_number || "—"} />
                <ReviewRow label="Date of Birth" value={form.date_of_birth || "—"} />
                <ReviewRow label="Gender" value={form.gender || "—"} />
                {activeFields.map((f) => (
                  <ReviewRow
                    key={f.key}
                    label={f.label}
                    value={dynamicData[f.key] || "—"}
                  />
                ))}
              </div>

              {submitError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">
                  <AlertTriangle size={15} />
                  {submitError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer nav buttons */}
        <div className="flex gap-3">
          <button
            onClick={goBack}
            className="tap-scale flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#d8e6db] bg-white py-3.5 text-sm font-bold text-[#1f2937]"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {currentStep.id === "review" ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="tap-scale flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2d8a42] to-[#1a5f2a] py-3.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {submitting ? (
                "Saving..."
              ) : (
                <>
                  <Check size={16} />
                  Save Registration
                </>
              )}
            </button>
          ) : (
            <button
              onClick={goNext}
              className="tap-scale flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2d8a42] to-[#1a5f2a] py-3.5 text-sm font-bold text-white"
            >
              Next
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, help, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#4b5563]">
        {label}
      </label>
      {children}
      {help && <div className="mt-1 text-xs text-[#6b7280]">{help}</div>}
      {error && (
        <div className="mt-1 text-xs font-medium text-red-600">{error}</div>
      )}
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="text-[#6b7280]">{label}</span>
      <span className="max-w-[60%] truncate text-right font-semibold text-[#1f2937]">
        {value}
      </span>
    </div>
  );
}
