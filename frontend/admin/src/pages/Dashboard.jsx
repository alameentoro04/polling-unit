import { useEffect, useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  Target,
  TrendingUp,
  MapPin,
  CheckCircle2,
  UserCheck,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import SkeletonCard from "../components/SkeletonCard";
import StatCard from "../components/StatCard";
import ActivityFeed from "../components/ActivityFeed";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

const COLORS = ["#9ca3af", "#c99a3d", "#22a35a"];

function formatClock(date) {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

const LiveClock = memo(function LiveClock({ lastUpdated }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const clock = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(clock);
  }, []);
  return (
    <div className="ops-updated">Last updated {formatClock(lastUpdated)}</div>
  );
});

export default function Dashboard() {
  const { api, user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [lgas, setLgas] = useState([]);
  const [completion, setCompletion] = useState({});
  const [lastChecksum, setLastChecksum] = useState("");
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [filters, setFilters] = useState({
    lga_id: "",
    ward_id: "",
    polling_unit_id: "",
    date_from: "",
    date_to: "",
  });

  const [allLgas, setAllLgas] = useState([]);
  const [wards, setWards] = useState([]);
  const [pollingUnits, setPollingUnits] = useState([]);

  useEffect(() => {
    api.get("/lgas").then((res) => setAllLgas(res.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadWards = (lgaId) => {
    if (!lgaId) return setWards([]);
    api.get(`/lgas/${lgaId}/wards`).then((res) => setWards(res.data));
  };

  const loadPollingUnits = (wardId) => {
    if (!wardId) return setPollingUnits([]);
    api
      .get(`/wards/${wardId}/polling-units`)
      .then((res) => setPollingUnits(res.data));
  };

  useEffect(() => {
    const poll = setInterval(checkUpdates, 15000);
    checkUpdates();
    return () => clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const checkUpdates = async () => {
    try {
      const res = await api.get("/dashboard/checksum");
      if (res.data.checksum !== lastChecksum) {
        setLastChecksum(res.data.checksum);
        await fetchAll();
      }
    } catch (e) {
      console.error("Poll error:", e);
    }
  };

  const fetchAll = async () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));

    const [sumRes, dailyRes, lgaRes, compRes] = await Promise.all([
      api.get(`/dashboard/summary?${params}`),
      api.get(`/dashboard/daily?${params}`),
      api.get(`/dashboard/lgas?${params}`),
      api.get(`/dashboard/completion?${params}`),
    ]);

    setSummary(sumRes.data);
    setDaily(dailyRes.data.map((d) => ({ date: d.date, count: d.count })));
    setLgas(lgaRes.data);
    setCompletion(compRes.data);
    setLastUpdated(new Date());
  };

  if (!summary)
    return (
      <div>
        <h1 className="text-lg font-bold mb-4">Dashboard</h1>
        <div className="summary-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );

  const completionData = [
    { name: "Not Started", value: completion.not_started || 0 },
    { name: "In Progress", value: completion.in_progress || 0 },
    { name: "Completed", value: completion.completed || 0 },
  ];

  const todayCount = daily[daily.length - 1]?.count ?? 0;
  const yesterdayCount = daily[daily.length - 2]?.count ?? 0;
  const regTrend =
    yesterdayCount > 0
      ? Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100)
      : null;

  return (
    <div>
      {/* Situation Room header */}
      <div className="ops-header">
        <div>
          <h1 className="ops-title">Situation Room</h1>
          <div className="ops-subtitle">Bauchi State • Election Monitoring</div>
        </div>
        <div className="ops-header-right">
          <div className="ops-live">
            <motion.span
              className="ops-live-dot"
              animate={{ opacity: [1, 0.35, 1] }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            Live
          </div>
          <LiveClock lastUpdated={lastUpdated} />
          <div className="ops-profile-chip">
            <div className="ops-profile-avatar">
              {(user?.full_name || "?")
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <div>
              <div className="ops-profile-name">{user?.full_name}</div>
              <div className="ops-profile-role">
                {user?.role?.replace("_", " ")}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <select
          className="select"
          value={filters.lga_id}
          onChange={(e) => {
            const val = e.target.value;
            setFilters((f) => ({
              ...f,
              lga_id: val,
              ward_id: "",
              polling_unit_id: "",
            }));
            loadWards(val);
            setPollingUnits([]);
          }}
        >
          <option value="">All LGAs</option>
          {allLgas.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>

        {filters.lga_id && (
          <select
            className="select"
            value={filters.ward_id}
            onChange={(e) => {
              const val = e.target.value;
              setFilters((f) => ({ ...f, ward_id: val, polling_unit_id: "" }));
              loadPollingUnits(val);
            }}
          >
            <option value="">All Wards</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        )}

        {filters.ward_id && (
          <select
            className="select"
            value={filters.polling_unit_id}
            onChange={(e) =>
              setFilters((f) => ({ ...f, polling_unit_id: e.target.value }))
            }
          >
            <option value="">All Polling Units</option>
            {pollingUnits.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}

        <input
          className="input"
          type="date"
          value={filters.date_from}
          onChange={(e) =>
            setFilters((f) => ({ ...f, date_from: e.target.value }))
          }
        />
        <input
          className="input"
          type="date"
          value={filters.date_to}
          onChange={(e) =>
            setFilters((f) => ({ ...f, date_to: e.target.value }))
          }
        />
        <button
          className="btn btn-secondary"
          onClick={() => {
            setFilters({
              lga_id: "",
              ward_id: "",
              polling_unit_id: "",
              date_from: "",
              date_to: "",
            });
            setWards([]);
            setPollingUnits([]);
          }}
        >
          Clear
        </button>
      </div>

      {/* Stat cards */}
      <div className="summary-grid">
        <StatCard
          icon={Users}
          label="Total Registered"
          value={summary.total_registered}
          color="primary"
          trend={regTrend != null ? { value: regTrend } : null}
        />
        <StatCard
          icon={Target}
          label="Registration Target"
          value={summary.total_target}
          color="gold"
        />
        <StatCard
          icon={TrendingUp}
          label="Completion Rate"
          value={summary.completion_percentage}
          format={(n) => `${n}%`}
          color="primary"
          progress={summary.completion_percentage}
        />
        <StatCard
          icon={MapPin}
          label="Polling Units"
          value={summary.total_polling_units}
          color="info"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed PUs"
          value={summary.completed_polling_units}
          color="primary"
          progress={
            summary.total_polling_units
              ? (summary.completed_polling_units /
                  summary.total_polling_units) *
                100
              : 0
          }
        />
        <StatCard
          icon={UserCheck}
          label="Active Agents"
          value={summary.total_agents}
          color="info"
        />
        <StatCard
          icon={XCircle}
          label="Failed Syncs"
          value={summary.pending_sync ?? 0}
          color="danger"
        />
        <StatCard
          icon={AlertTriangle}
          label="Conflicts"
          value={summary.conflicts ?? 0}
          color="danger"
          onClick={() => navigate("/conflicts")}
        />
      </div>

      {/* Activity feed + charts */}
      <div className="ops-main-grid">
        <div className="charts-grid" style={{ margin: 0 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Daily Registrations</div>
            </div>
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">LGA Performance</div>
            </div>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={lgas.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  angle={-30}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar
                  dataKey="registered"
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="target"
                  fill="var(--gray-200)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">PU Completion Status</div>
            </div>
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie
                  data={completionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {completionData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <ActivityFeed />
      </div>
    </div>
  );
}
