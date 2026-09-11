import { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

const variants = {
  success: { icon: CheckCircle2, color: "var(--success)", bg: "#e4f6ea" },
  warning: { icon: AlertTriangle, color: "var(--warning)", bg: "var(--accent-light)" },
  error: { icon: XCircle, color: "var(--danger)", bg: "var(--danger-light)" },
  info: { icon: Info, color: "var(--info)", bg: "#e2ecfd" },
};

export default function Toast({ message, type = "info", onClose, duration = 4000, offset = 0 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const variant = variants[type] || variants.info;
  const Icon = variant.icon;

  return (
    <motion.div
      className="toast"
      style={{ borderLeftColor: variant.color, top: 20 + offset * 68 }}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="toast-icon" style={{ background: variant.bg, color: variant.color }}>
        <Icon size={16} strokeWidth={2.5} />
      </div>
      <div className="toast-message">{message}</div>
      <button onClick={onClose} className="toast-close" aria-label="Dismiss">
        <X size={14} />
      </button>
    </motion.div>
  );
}
