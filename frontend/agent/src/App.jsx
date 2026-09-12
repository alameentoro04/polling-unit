import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth, api } from "./hooks/useAuth";
import { useNetwork } from "./hooks/useNetwork";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { startAutoSync } from "./services/sync";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Register from "./pages/Register";
import Records from "./pages/Records";
import Complaint from "./pages/Complaint";
import MyComplaints from "./pages/MyComplaints";
import OfflineBanner from "./components/OfflineBanner";
import BottomNav from "./components/BottomNav";

const HIDE_NAV_ON = ["/register"];

function App() {
  const { user, loading } = useAuth();
  const isOnline = useNetwork();
  const location = useLocation();

  useEffect(() => {
    if (!user) return;

    const stopSync = startAutoSync();

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
      <div className="app-loading">
        <div className="app-loading-title">Situation Room</div>
        <div className="app-loading-subtitle">Loading…</div>
      </div>
    );
  }

  const showNav = user && !HIDE_NAV_ON.includes(location.pathname);

  return (
    <>
      <OfflineBanner isOnline={isOnline} />
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
        >
          <Routes location={location}>
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
              path="/complaint"
              element={user ? <Complaint /> : <Navigate to="/login" />}
            />
            <Route
              path="/my-complaints"
              element={user ? <MyComplaints /> : <Navigate to="/login" />}
            />
          </Routes>
        </motion.div>
      </AnimatePresence>
      {showNav && <BottomNav />}
    </>
  );
}

export default App;
