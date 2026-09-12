import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function Drawer({
  open,
  onClose,
  title,
  children,
  width = 420,
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="drawer-panel"
            style={{ width }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{
              type: "tween",
              duration: 0.28,
              ease: [0.4, 0, 0.2, 1],
            }}
          >
            <div className="drawer-header">
              <div className="drawer-title">{title}</div>
              <button
                className="drawer-close"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="drawer-body">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
