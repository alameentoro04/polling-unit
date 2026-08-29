import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import DarkModeToggle from "./DarkModeToggle";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  const navItems = [
    { to: "/", label: "Dashboard", icon: "📊" },
    { to: "/analytics", label: "Analytics", icon: "📈" },
    { to: "/map", label: "Map", icon: "🗺️" },
    { to: "/registrations", label: "Registrations", icon: "📝" },
    ...(isAdmin
      ? [
          { to: "/users", label: "User Management", icon: "👥" },
          { to: "/form-builder", label: "Form Builder", icon: "🛠️" },
          { to: "/settings", label: "Settings", icon: "⚙️" },
          { to: "/import", label: "Import Data", icon: "📥" },
          { to: "/conflicts", label: "Sync Conflicts", icon: "⚠️" },
          { to: "/agents", label: "Agent Performance", icon: "🏆" },
          { to: "/audit-logs", label: "Audit Logs", icon: "📋" },
        ]
      : []),
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">Situation Room</div>
        <div className="sidebar-subtitle">Bauchi State PU Monitoring</div>
        <DarkModeToggle />
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? "active" : ""}`
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-xs">{user?.full_name}</div>
            <div className="text-xs opacity-60 capitalize">
              {user?.role?.replace("_", " ")}
            </div>
          </div>
          <button
            onClick={logout}
            className="btn btn-sm btn-secondary"
            style={{
              color: "white",
              background: "rgba(255,255,255,0.1)",
              border: "none",
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
