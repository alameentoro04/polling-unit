import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu } from "lucide-react";
import { useAuth } from "./hooks/useAuth";
import { useToast } from "./hooks/useToast";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Sidebar from "./components/Sidebar";
import Toast from "./components/Toast";
import ErrorBoundary from "./components/ErrorBoundary";

const Map = lazy(() => import("./pages/Map"));
const Registrations = lazy(() => import("./pages/Registrations"));
const Import = lazy(() => import("./pages/Import"));
const Users = lazy(() => import("./pages/Users"));
const PollingUnits = lazy(() => import("./pages/PollingUnits"));
const Wards = lazy(() => import("./pages/Wards"));
const Complaints = lazy(() => import("./pages/Complaints"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const SyncConflicts = lazy(() => import("./pages/SyncConflicts"));
const AgentPerformance = lazy(() => import("./pages/AgentPerformance"));
const Settings = lazy(() => import("./pages/Settings"));
const FormBuilder = lazy(() => import("./pages/FormBuilder"));
const Analytics = lazy(() => import("./pages/Analytics"));

function RouteFallback() {
  return <div className="text-center mt-4 text-gray-500">Loading…</div>;
}

function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <div className="mobile-topbar">
        <button
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <span className="mobile-topbar-title">Situation Room</span>
      </div>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-content">{children}</main>
    </div>
  );
}

function App() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { toasts, addToast, removeToast } = useToast();

  if (loading) {
    return (
      <div className="login-page">
        <div className="text-white text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const isAdmin = user.role === "admin";

  return (
    <>
      <AnimatePresence>
        {toasts.map((t, i) => (
          <Toast
            key={t.id}
            message={t.message}
            type={t.type}
            onClose={() => removeToast(t.id)}
            offset={i}
          />
        ))}
      </AnimatePresence>
      <AppLayout>
        <Suspense fallback={<RouteFallback />}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            >
              <Routes>
                <Route
                  path="/"
                  element={
                    <ErrorBoundary>
                      <Dashboard />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/map"
                  element={
                    <ErrorBoundary>
                      <Map />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/registrations"
                  element={
                    <ErrorBoundary>
                      <Registrations />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/complaints"
                  element={
                    <ErrorBoundary>
                      <Complaints />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/import"
                  element={
                    isAdmin ? (
                      <ErrorBoundary>
                        <Import />
                      </ErrorBoundary>
                    ) : (
                      <Navigate to="/" />
                    )
                  }
                />
                <Route
                  path="/conflicts"
                  element={
                    isAdmin ? (
                      <ErrorBoundary>
                        <SyncConflicts />
                      </ErrorBoundary>
                    ) : (
                      <Navigate to="/" />
                    )
                  }
                />
                <Route
                  path="/users"
                  element={
                    isAdmin ? (
                      <ErrorBoundary>
                        <Users />
                      </ErrorBoundary>
                    ) : (
                      <Navigate to="/" />
                    )
                  }
                />
                <Route
                  path="/polling-units"
                  element={
                    isAdmin ? (
                      <ErrorBoundary>
                        <PollingUnits />
                      </ErrorBoundary>
                    ) : (
                      <Navigate to="/" />
                    )
                  }
                />
                <Route
                  path="/wards"
                  element={
                    isAdmin ? (
                      <ErrorBoundary>
                        <Wards />
                      </ErrorBoundary>
                    ) : (
                      <Navigate to="/" />
                    )
                  }
                />
                <Route path="/analytics" element={<Analytics />} />
                <Route
                  path="/settings"
                  element={isAdmin ? <Settings /> : <Navigate to="/" />}
                />
                <Route
                  path="/form-builder"
                  element={isAdmin ? <FormBuilder /> : <Navigate to="/" />}
                />
                <Route
                  path="/agents"
                  element={
                    <ErrorBoundary>
                      <AgentPerformance />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/audit-logs"
                  element={
                    isAdmin ? (
                      <ErrorBoundary>
                        <AuditLogs />
                      </ErrorBoundary>
                    ) : (
                      <Navigate to="/" />
                    )
                  }
                />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </AppLayout>
    </>
  );
}

export default App;
