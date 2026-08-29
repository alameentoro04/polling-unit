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

  const colors = {
    info: "#2563eb",
    success: "#16a34a",
    warning: "#f59e0b",
    error: "#dc2626",
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        background: "white",
        borderLeft: `4px solid ${colors[type]}`,
        padding: "1rem 1.25rem",
        borderRadius: "0.5rem",
        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
        zIndex: 9999,
        minWidth: 280,
        animation: "slideIn 0.3s ease",
      }}
    >
      <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#1f2937" }}>
        {message}
      </div>
      <button
        onClick={onClose}
        style={{ position: "absolute", top: 8, right: 8, color: "#9ca3af" }}
      >
        ✕
      </button>
    </div>
  );
}
