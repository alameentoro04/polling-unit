import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { api } from "./hooks/useAuth";
import { useNetwork } from "./hooks/useNetwork";
import { useEffect } from "react";
import { startAutoSync } from "./services/sync";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Register from "./pages/Register";
import Records from "./pages/Records";
import Profile from "./pages/Profile";
import OfflineBanner from "./components/OfflineBanner";
import BottomNav from "./components/BottomNav";

function App() {
  const { user, loading } = useAuth();
  const isOnline = useNetwork();

  useEffect(() => {
    if (!user) return;

    // Start auto sync
    const stopSync = startAutoSync();

    // Heartbeat every 60 seconds
    const heartbeat = setInterval(() => {
      if (navigator.onLine) {
        api.post("/agent/heartbeat").catch(() => {});
      }
    }, 60000);

    return () => {
      stopSync();
      clearInterval(heartbeat);
    };
  }, [user]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "1.25rem",
              fontWeight: "bold",
              color: "#1a5f2a",
              marginBottom: "0.5rem",
            }}
          >
            PU Agent
          </div>
          <div style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <OfflineBanner isOnline={isOnline} />
      <div className={user ? "pb-28" : ""}>
        <Routes>
          <Route
            path="/login"
            element={!user ? <Login /> : <Navigate to="/" />}
          />
          <Route
            path="/"
            element={user ? <Dashboard /> : <Navigate to="/login" />}
          />
          <Route
            path="/register"
            element={user ? <Register /> : <Navigate to="/login" />}
          />
          <Route
            path="/records"
            element={user ? <Records /> : <Navigate to="/login" />}
          />
          <Route
            path="/profile"
            element={user ? <Profile /> : <Navigate to="/login" />}
          />
        </Routes>
      </div>
      {user && <BottomNav />}
    </>
  );
}

export default App;
