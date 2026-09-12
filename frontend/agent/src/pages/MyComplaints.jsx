import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquareWarning } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useNetwork } from "../hooks/useNetwork";
import { getMyComplaints } from "../services/db";
import EmptyState from "../components/EmptyState";

const statusColors = { open: "yellow", reviewed: "green", resolved: "gray" };

export default function MyComplaints() {
  const navigate = useNavigate();
  const { api } = useAuth();
  const isOnline = useNetwork();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComplaints();
  }, [isOnline]);

  const loadComplaints = async () => {
    const local = await getMyComplaints();

    if (isOnline) {
      try {
        const res = await api.get("/agent/complaints");
        const serverComplaints = res.data.data.map((c) => ({
          client_id: `server-${c.id}`,
          complainant_type: c.complainant_type,
          complainant_name: c.complainant_name,
          complaint_text: c.complaint_text,
          status: c.status,
          submitted_at: c.submitted_at,
          sync_status: "synced",
        }));
        const localOnly = local.filter((l) => l.sync_status !== "synced");
        const merged = [...localOnly, ...serverComplaints].sort(
          (a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)
        );
        setComplaints(merged);
        setLoading(false);
        return;
      } catch (e) {}
    }
    setComplaints(local);
    setLoading(false);
  };

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
        <div className="text-lg font-bold">My Complaints</div>
      </div>

      <div className="container">
        {loading ? (
          <div className="text-center p-4 text-gray-500">Loading…</div>
        ) : complaints.length === 0 ? (
          <EmptyState
            icon={MessageSquareWarning}
            title="No complaints filed"
            description="Anything you or a voter reports will show up here."
            action={
              <button
                className="btn btn-primary"
                onClick={() => navigate("/complaint")}
              >
                <MessageSquareWarning size={16} /> File a Complaint
              </button>
            }
          />
        ) : (
          complaints.map((c) => (
            <div className="card mb-3" key={c.client_id}>
              <div className="flex justify-between items-start mb-2">
                <div className="text-xs text-gray-500">
                  {c.complainant_type === "voter"
                    ? `From: ${
                        c.complainant_name || "a voter (name not given)"
                      }`
                    : "Your own observation"}
                </div>
                <span
                  className={`badge badge-${
                    c.sync_status !== "synced"
                      ? "yellow"
                      : statusColors[c.status] || "gray"
                  }`}
                >
                  {c.sync_status !== "synced" ? "Pending sync" : c.status}
                </span>
              </div>
              <div className="text-sm mb-2">{c.complaint_text}</div>
              <div className="text-xs text-gray-400">
                {new Date(c.submitted_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
