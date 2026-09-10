import { useLocation, useNavigate } from "react-router-dom";
import { Home, ClipboardList, ListChecks, UserCircle } from "lucide-react";

const TABS = [
  { path: "/", label: "Home", icon: Home },
  { path: "/register", label: "Register Person", icon: ClipboardList },
  { path: "/records", label: "View Records", icon: ListChecks },
  { path: "/profile", label: "Profile", icon: UserCircle },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeIndex = TABS.findIndex((tab) =>
    tab.path === "/" ? location.pathname === "/" : location.pathname.startsWith(tab.path)
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
    >
      <div className="glass-pill relative flex w-full max-w-md items-end justify-between rounded-[28px] px-2 pb-2 pt-6">
        {TABS.map((tab, index) => {
          const isActive = index === activeIndex;
          const Icon = tab.icon;

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              className="tap-scale relative flex flex-1 flex-col items-center gap-1 py-1"
            >
              {isActive && (
                <span
                  className="glass-bubble-active animate-pop-up absolute -top-9 flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ border: "3px solid rgba(255,255,255,0.9)" }}
                >
                  <Icon size={24} color="#1a5f2a" strokeWidth={2.2} />
                </span>
              )}

              {!isActive && <Icon size={22} color="rgba(255,255,255,0.75)" strokeWidth={1.8} />}

              <span
                className={
                  isActive
                    ? "mt-6 text-[11px] font-semibold text-white"
                    : "text-[11px] font-medium text-white/60"
                }
              >
                {tab.label}
              </span>

              {isActive && (
                <span className="mt-0.5 h-1 w-5 rounded-full bg-white" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
