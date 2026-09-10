import { useAuth } from "../hooks/useAuth";
import {
  LogOut,
  MapPin,
  User,
  ShieldCheck,
  Landmark,
  Info,
} from "lucide-react";

export default function Profile() {
  const { user, logout } = useAuth();

  const initials = (user?.name || user?.username || "A")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const assignment = user?.assignment;

  const handleLogout = () => {
    if (confirm("Sign out of this device?")) logout();
  };

  return (
    <div className="min-h-screen bg-[#f6f8f6]">
      <div className="mx-auto max-w-md px-4 pb-6 pt-6">
        <div className="mb-5">
          <div className="text-lg font-bold text-[#1f2937]">Profile</div>
          <div className="text-xs text-[#6b7280]">
            Your account and assignment details
          </div>
        </div>

        {/* Hero */}
        <div
          className="glass-bubble animate-fade-slide-up mb-4 flex flex-col items-center rounded-3xl p-6 text-center"
          style={{ boxShadow: "0 14px 34px rgba(18,74,31,0.28)" }}
        >
          <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-white/15 text-xl font-bold text-white ring-2 ring-white/40">
            {initials}
          </div>
          <div className="text-lg font-bold text-white">
            {user?.name || user?.username || "Agent"}
          </div>
          <div className="text-sm text-white/70">@{user?.username}</div>
        </div>

        {/* Assignment info */}
        <div
          className="glass-panel-light animate-fade-slide-up mb-4 flex flex-col divide-y divide-gray-100 rounded-3xl p-2"
          style={{ animationDelay: "0.05s" }}
        >
          <InfoRow
            icon={MapPin}
            label="Assigned polling unit"
            value={assignment?.polling_unit_name || "Not assigned"}
          />
          <InfoRow
            icon={Landmark}
            label="Ward / LGA"
            value={
              assignment
                ? `${assignment.ward_name || "—"} · ${assignment.lga_name || "—"}`
                : "—"
            }
          />
          <InfoRow
            icon={User}
            label="Role"
            value={user?.role ? formatRole(user.role) : "Agent"}
          />
          <InfoRow icon={ShieldCheck} label="Account status" value="Active" />
        </div>

        {/* About */}
        <div
          className="glass-panel-light animate-fade-slide-up mb-6 flex items-center gap-3 rounded-2xl px-4 py-3.5"
          style={{ animationDelay: "0.15s" }}
        >
          <Info size={16} className="shrink-0 text-[#8a998e]" />
          <div className="text-xs text-[#6b7280]">
            PU Agent · Bauchi State Registration
            <br />
            Need help? Contact your ward coordinator.
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="tap-scale flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 py-3.5 font-semibold text-red-600"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-3 py-3.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1a5f2a]/10">
        <Icon size={17} color="#1a5f2a" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[#8a998e]">
          {label}
        </div>
        <div className="truncate text-sm font-semibold text-[#1f2937]">{value}</div>
      </div>
    </div>
  );
}

function formatRole(role) {
  return role
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}