import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  UserPlus,
  UserCog,
  Trash2,
  AlertTriangle,
  MessageSquareWarning,
  MapPin,
  Landmark,
  Upload,
  CheckCircle2,
  RefreshCw,
  FileText,
  History,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import SkeletonTable from "../components/SkeletonTable";
import EmptyState from "../components/EmptyState";
import Pagination from "../components/Pagination";

const actionMeta = (action) => {
  if (action.startsWith("USER_") || action.includes("AGENT_ASSIGN"))
    return { icon: UserPlus, color: "info" };
  if (action.includes("DEACTIVAT") || action.includes("DELETED"))
    return { icon: Trash2, color: "danger" };
  if (action.includes("CONFLICT"))
    return { icon: AlertTriangle, color: "danger" };
  if (action.includes("COMPLAINT"))
    return { icon: MessageSquareWarning, color: "warning" };
  if (action.includes("POLLING_UNIT"))
    return { icon: MapPin, color: "primary" };
  if (action.includes("WARD")) return { icon: Landmark, color: "primary" };
  if (action.includes("IMPORT")) return { icon: Upload, color: "info" };
  if (action.includes("REGISTRATION_CREATED"))
    return { icon: CheckCircle2, color: "success" };
  if (action.includes("RESOLVED")) return { icon: RefreshCw, color: "success" };
  return { icon: FileText, color: "gray" };
};

function groupByDate(logs) {
  const groups = new Map();
  for (const log of logs) {
    const key = new Date(log.created_at).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(log);
  }
  return [...groups.entries()];
}

export default function AuditLogs() {
  const { api } = useAuth();
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (actionFilter) params.append("action", actionFilter);
    const res = await api.get(`/audit-logs?${params}`);
    setLogs(res.data.data);
    setPagination({
      current_page: res.data.current_page,
      last_page: res.data.last_page,
      total: res.data.total,
    });
    setLoading(false);
  };

  const grouped = groupByDate(logs);

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">Audit Logs</h1>

      <div className="filters-bar mb-4">
        <select
          className="select"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="">All Actions</option>
          <option value="REGISTRATION_CREATED">Registration Created</option>
          <option value="REGISTRATION_DELETED">Registration Deleted</option>
          <option value="SYNC_CONFLICT">Sync Conflict</option>
          <option value="COMPLAINT_SUBMITTED">Complaint Submitted</option>
          <option value="POLLING_UNIT_CREATED">Polling Unit Created</option>
          <option value="WARD_CREATED">Ward Created</option>
          <option value="EXCEL_IMPORTED">Excel Imported</option>
          <option value="USER_DEACTIVATED">User Deactivated</option>
        </select>
        <div className="text-xs text-gray-500 flex items-center">
          {loading
            ? "Loading…"
            : `${pagination.total?.toLocaleString() || 0} events`}
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={8} columns={4} />
      ) : logs.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={History}
            title="No audit events found"
            description="Try a different filter."
          />
        </div>
      ) : (
        <div className="card">
          <div className="timeline">
            {grouped.map(([date, dayLogs]) => (
              <div key={date} className="timeline-group">
                <div className="timeline-date">{date}</div>
                {dayLogs.map((log, i) => {
                  const meta = actionMeta(log.action);
                  const Icon = meta.icon;
                  return (
                    <motion.div
                      key={log.id}
                      className="timeline-item"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.2,
                        delay: Math.min(i * 0.02, 0.3),
                      }}
                    >
                      <div
                        className={`timeline-icon timeline-icon-${meta.color}`}
                      >
                        <Icon size={13} />
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-action">
                          {log.action.replace(/_/g, " ")}
                          <span className="timeline-entity">
                            {log.entity_type} #{log.entity_id}
                          </span>
                        </div>
                        <div className="timeline-meta">
                          {log.actor?.full_name || "System"} •{" "}
                          {new Date(log.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>

          <Pagination
            currentPage={pagination.current_page || 1}
            lastPage={pagination.last_page || 1}
            onChange={fetchLogs}
          />
        </div>
      )}
    </div>
  );
}
