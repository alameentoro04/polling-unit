import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { useToast } from "./hooks/useToast";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Map from "./pages/Map";
import Registrations from "./pages/Registrations";
import Import from "./pages/Import";
import Users from "./pages/Users";
import AuditLogs from "./pages/AuditLogs";
import SyncConflicts from "./pages/SyncConflicts";
import Sidebar from "./components/Sidebar";
import AgentPerformance from "./pages/AgentPerformance";
import Toast from "./components/Toast";
import ErrorBoundary from "./components/ErrorBoundary";
import Settings from "./pages/Settings";
import FormBuilder from "./pages/FormBuilder";
import Analytics from "./pages/Analytics";

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
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
      {toasts.map((t) => (
        <Toast
          key={t.id}
          message={t.message}
          type={t.type}
          onClose={() => removeToast(t.id)}
        />
      ))}
      <AppLayout>
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
      </AppLayout>
    </>
  );
}

export default App;
