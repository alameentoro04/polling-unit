import { NavLink } from "react-router-dom";
import { Home, UserPlus, MessageSquareWarning, MessageSquareText, ClipboardList } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/register", label: "Register", icon: UserPlus },
  { to: "/complaint", label: "Complaint", icon: MessageSquareWarning },
  { to: "/my-complaints", label: "Complaints", icon: MessageSquareText },
  { to: "/records", label: "Records", icon: ClipboardList },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `bottom-nav-item ${isActive ? "active" : ""}`}
        >
          <item.icon size={20} strokeWidth={2} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
