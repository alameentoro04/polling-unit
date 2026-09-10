import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useNetwork } from "../hooks/useNetwork";
import { storeComplaint } from "../services/db";
import { syncPendingComplaints } from "../services/sync";

export default function Complaint() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOnline = useNetwork();
  const [complainantType, setComplainantType] = useState("agent");
  const [complainantName, setComplainantName] = useState("");
  const [complainantPhone, setComplainantPhone] = useState("");
  const [complaintText, setComplaintText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!complaintText.trim()) {
      setError("Please describe the complaint.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await storeComplaint({
        complainant_type: complainantType,
        complainant_name: complainantType === "voter" ? complainantName : null,
        complainant_phone:
          complainantType === "voter" ? complainantPhone : null,
        complaint_text: complaintText.trim(),
        polling_unit_id: user?.assignment?.polling_unit_id || null,
      });
      if (isOnline) syncPendingComplaints();
      setSubmitted(true);
    } catch (err) {
      setError("Couldn't save the complaint. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="container">
        <div className="card text-center p-4">
          <div className="text-lg font-bold mb-2">Complaint Recorded</div>
          <div className="text-sm text-gray-500 mb-3">
            {isOnline
              ? "It's been saved and sent to the situation room."
              : "It's saved on this device and will send automatically once you're back online."}
          </div>
          <button className="btn btn-primary" onClick={() => navigate("/")}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <button
          onClick={() => navigate("/")}
          className="text-xs opacity-80"
          style={{ color: "white", marginBottom: "0.5rem" }}
        >
          ← Back
        </button>
        <div className="text-lg font-bold">File a Complaint</div>
        <div className="text-xs opacity-80">
          {user?.assignment?.polling_unit_name || "Your polling unit"}
        </div>
      </div>

      <div className="container">
        <form onSubmit={handleSubmit}>
          <div className="card">
            <div className="form-group">
              <label className="label">Who is this complaint from? *</label>
              <select
                className="input"
                value={complainantType}
                onChange={(e) => setComplainantType(e.target.value)}
              >
                <option value="agent">Myself (agent observation)</option>
                <option value="voter">A registered voter</option>
              </select>
            </div>

            {complainantType === "voter" && (
              <>
                <div className="form-group">
                  <label className="label">Voter's Name</label>
                  <input
                    className="input"
                    value={complainantName}
                    onChange={(e) => setComplainantName(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Voter's Phone Number</label>
                  <input
                    className="input"
                    value={complainantPhone}
                    onChange={(e) => setComplainantPhone(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">What's the complaint? *</label>
              <textarea
                className="input"
                rows={5}
                value={complaintText}
                onChange={(e) => setComplaintText(e.target.value)}
                placeholder="Describe what happened..."
                required
              />
            </div>
          </div>

          {error && (
            <div
              className="badge badge-red mb-3"
              style={{ width: "100%", justifyContent: "center" }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Submit Complaint"}
          </button>
        </form>
      </div>
    </div>
  );
}
