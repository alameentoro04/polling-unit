import { AnimatePresence, motion } from "framer-motion";
import { CloudOff, Wifi } from "lucide-react";
import { useEffect, useState } from "react";

export default function OfflineBanner({ isOnline }) {
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline) {
      setShowReconnected(true);
      setWasOffline(false);
      const t = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(t);
    }
  }, [isOnline, wasOffline]);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          className="offline-banner"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <CloudOff size={15} />
          <div>
            <div className="offline-banner-title">Working offline</div>
            <div className="offline-banner-subtitle">
              Everything you do is saved on this device and will sync
              automatically once you're back online.
            </div>
          </div>
        </motion.div>
      )}
      {showReconnected && (
        <motion.div
          className="offline-banner reconnected"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Wifi size={15} />
          <div className="offline-banner-title">Back online — syncing…</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
