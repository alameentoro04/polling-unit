import { motion } from "framer-motion";
import { Inbox } from "lucide-react";

export default function EmptyState({ icon: Icon = Inbox, title = "Nothing here yet", description, action }) {
  return (
    <motion.div
      className="empty-state"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="empty-state-icon">
        <Icon size={24} strokeWidth={1.75} />
      </div>
      <div className="empty-state-title">{title}</div>
      {description && <div className="empty-state-description">{description}</div>}
      {action && <div className="empty-state-action">{action}</div>}
    </motion.div>
  );
}
