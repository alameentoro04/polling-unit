import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserCheck,
  Target,
  WifiOff,
  AlertTriangle,
  MessageSquareWarning,
  Info,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const typeMeta = {
  registration: { icon: UserCheck, color: "var(--primary)" },
  target: { icon: Target, color: "var(--accent)" },
  offline: { icon: WifiOff, color: "var(--gray-400)" },
  conflict: { icon: AlertTriangle, color: "var(--danger)" },
  complaint: { icon: MessageSquareWarning, color: "var(--danger)" },
  assignment: { icon: UserCheck, color: "var(--info)" },
  info: { icon: Info, color: "var(--gray-400)" },
};

function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - new Date(timestamp)) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function ActivityFeed() {
  const { api } = useAuth();
  const [items, setItems] = useState(null);
  const [, forceTick] = useState(0);

  useEffect(() => {
    const load = () => {
      api
        .get("/dashboard/activity")
        .then((res) => setItems(res.data))
        .catch(() => {});
    };
    load();
    const poll = setInterval(load, 20000);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    const tick = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(tick);
  }, []);

  return (
    <div className="card activity-feed">
      <div className="card-header">
        <div
          className="card-title"
          style={{ letterSpacing: "0.03em", fontSize: "0.75rem" }}
        >
          RECENT ACTIVITY
        </div>
      </div>

      {items === null ? (
        <div className="text-sm text-gray-400 p-2">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-400 p-2">Nothing yet today.</div>
      ) : (
        <ul className="activity-list">
          <AnimatePresence initial={false}>
            {items.map((item) => {
              const meta = typeMeta[item.type] || typeMeta.info;
              const Icon = meta.icon;
              return (
                <motion.li
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="activity-item"
                >
                  <span
                    className="activity-dot"
                    style={{ background: meta.color }}
                  >
                    <Icon size={11} color="white" strokeWidth={2.5} />
                  </span>
                  <div>
                    <div className="activity-message">{item.message}</div>
                    <div className="activity-time">
                      {timeAgo(item.timestamp)}
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
