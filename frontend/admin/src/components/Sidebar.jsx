import { NavLink, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  BarChart3,
  Map,
  ClipboardList,
  MapPin,
  Landmark,
  Users,
  Settings,
  Upload,
  AlertTriangle,
  Trophy,
  FileText,
  Wrench,
  MessageSquareWarning,
  ChevronDown,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import DarkModeToggle from "./DarkModeToggle";

function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function UserProfileMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="sidebar-profile" ref={ref}>
      <button className="sidebar-profile-trigger" onClick={() => setOpen((o) => !o)}>
        <div className="sidebar-avatar">{initials(user?.full_name)}</div>
        <div className="sidebar-profile-text">
          <div className="sidebar-profile-name">{user?.full_name}</div>
          <div className="sidebar-profile-role">{user?.role?.replace("_", " ")}</div>
        </div>
        <ChevronDown size={14} className={`sidebar-chevron ${open ? "open" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="sidebar-profile-menu"
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            <div className="sidebar-profile-menu-item" style={{ cursor: "default" }}>
              <UserIcon size={14} /> {user?.email || user?.username}
            </div>
            <button className="sidebar-profile-menu-item danger" onClick={logout}>
              <LogOut size={14} /> Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const navItems = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/map", label: "Map", icon: Map },
    { to: "/registrations", label: "Registrations", icon: ClipboardList },
    { to: "/complaints", label: "Complaints", icon: MessageSquareWarning },
    ...(isAdmin
      ? [
          { to: "/polling-units", label: "Polling Units", icon: MapPin },
          { to: "/wards", label: "Wards", icon: Landmark },
          { to: "/users", label: "User Management", icon: Users },
          { to: "/form-builder", label: "Form Builder", icon: Wrench },
          { to: "/settings", label: "Settings", icon: Settings },
          { to: "/import", label: "Import Data", icon: Upload },
          { to: "/conflicts", label: "Sync Conflicts", icon: AlertTriangle },
          { to: "/agents", label: "Agent Performance", icon: Trophy },
          { to: "/audit-logs", label: "Audit Logs", icon: FileText },
        ]
      : []),
  ];

  const content = (
    <>
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
            onClick={onClose}
            className={({ isActive }) => `sidebar-nav-item ${isActive ? "active" : ""}`}
          >
            <item.icon size={16} strokeWidth={2} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <UserProfileMenu />
      </div>
    </>
  );

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Desktop: always-visible static sidebar */}
      <aside className="sidebar sidebar-desktop">{content}</aside>

      {/* Mobile: framer-motion slide-in drawer */}
      <AnimatePresence>
        {open && (
          <motion.aside
            className="sidebar sidebar-mobile"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            {content}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
