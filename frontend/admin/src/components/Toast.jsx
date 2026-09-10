import { useEffect } from "react";

export default function Toast({
  message,
  type = "info",
  onClose,
  duration = 4000,
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colorVar = {
    info: "var(--info)",
    success: "var(--success)",
    warning: "var(--warning)",
    error: "var(--danger)",
  }[type];

  return (
    <div
      className="toast"
      style={{ borderLeftColor: colorVar }}
    >
      <div className="toast-message">{message}</div>
      <button onClick={onClose} className="toast-close" aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
