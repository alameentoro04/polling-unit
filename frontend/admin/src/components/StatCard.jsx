import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import AnimatedNumber from "./AnimatedNumber";

const colorMap = {
  primary: { bg: "var(--primary)", light: "#e8f2ec" },
  gold: { bg: "var(--accent)", light: "var(--accent-light)" },
  danger: { bg: "var(--danger)", light: "var(--danger-light)" },
  info: { bg: "var(--info)", light: "#e2ecfd" },
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  format,
  color = "primary",
  trend, // { value: number, positiveIsGood?: boolean }
  progress, // 0-100
  onClick,
}) {
  const palette = colorMap[color] || colorMap.primary;
  const trendUp = trend && trend.value >= 0;
  const trendGood = trend
    ? trend.positiveIsGood === false
      ? !trendUp
      : trendUp
    : null;

  return (
    <motion.div
      className="stat-card"
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
      whileHover={{ y: -4, boxShadow: "var(--shadow-md)" }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
    >
      <div className="stat-card-top">
        <div
          className="stat-card-icon"
          style={{ background: palette.light, color: palette.bg }}
        >
          {Icon && <Icon size={18} strokeWidth={2.25} />}
        </div>
        {trend && (
          <div className={`stat-card-trend ${trendGood ? "up" : "down"}`}>
            {trendUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>

      <div className="stat-card-value">
        <AnimatedNumber value={value} format={format} />
      </div>
      <div className="stat-card-label">{label}</div>

      {progress != null && (
        <div className="stat-card-progress">
          <motion.div
            className="stat-card-progress-fill"
            style={{ background: palette.bg }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
      )}
    </motion.div>
  );
}
