import { useEffect, useState, useMemo } from "react";
import { Download, Printer } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import SkeletonChart from "../components/SkeletonChart";
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

const COLORS = [
  "#0f4a2c",
  "#c99a3d",
  "#c0392b",
  "#2563eb",
  "#7c3aed",
  "#0891b2",
];
const COMPLETION_COLORS = ["#9ca3af", "#c99a3d", "#22a35a"];

function bucketSeries(daily, granularity) {
  if (granularity === "daily") return daily;
  const buckets = new Map();
  for (const d of daily) {
    const date = new Date(d.date);
    let key;
    if (granularity === "weekly") {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().slice(0, 10);
    } else {
      key = d.date.slice(0, 7); // YYYY-MM
    }
    buckets.set(key, (buckets.get(key) || 0) + d.count);
  }
  return [...buckets.entries()]
    .sort()
    .map(([date, count]) => ({ date, count }));
}

export default function Analytics() {
  const { api } = useAuth();
  const [kpi, setKpi] = useState(null);
  const [gender, setGender] = useState([]);
  const [age, setAge] = useState([]);
  const [hourly, setHourly] = useState([]);
  const [trends, setTrends] = useState({ dates: [], agents: [] });
  const [lgaRankings, setLgaRankings] = useState([]);
  const [daily, setDaily] = useState([]);
  const [completion, setCompletion] = useState({});
  const [loading, setLoading] = useState(true);
  const [granularity, setGranularity] = useState("daily");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [
      kpiRes,
      genderRes,
      ageRes,
      hourlyRes,
      trendsRes,
      lgaRes,
      dailyRes,
      completionRes,
    ] = await Promise.all([
      api.get("/analytics/kpi"),
      api.get("/analytics/gender"),
      api.get("/analytics/age"),
      api.get("/analytics/hourly"),
      api.get("/analytics/trends"),
      api.get("/analytics/lga-rankings"),
      api.get("/dashboard/daily?days=90"),
      api.get("/dashboard/completion"),
    ]);
    setKpi(kpiRes.data);
    setGender(genderRes.data);
    setAge(ageRes.data);
    setHourly(hourlyRes.data);
    setTrends(trendsRes.data);
    setLgaRankings(lgaRes.data);
    setDaily(dailyRes.data);
    setCompletion(completionRes.data);
    setLoading(false);
  };

  const trendData = useMemo(
    () => bucketSeries(daily, granularity),
    [daily, granularity]
  );

  const completionData = [
    { name: "Not Started", value: completion.not_started || 0 },
    { name: "In Progress", value: completion.in_progress || 0 },
    { name: "Completed", value: completion.completed || 0 },
  ];

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const res = await api.get("/export/registrations");
      const link = document.createElement("a");
      link.href = res.data.download_url;
      link.download = res.data.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  if (loading)
    return (
      <div>
        <h1 className="text-lg font-bold mb-4">Analytics</h1>
        <div className="charts-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonChart key={i} />
          ))}
        </div>
      </div>
    );

  return (
    <div className="report-root">
      <div className="flex justify-between items-center mb-4 no-print">
        <h1 className="text-lg font-bold">Reporting Dashboard</h1>
        <div className="flex gap-2">
          <button
            className="btn btn-secondary"
            onClick={handleExportCsv}
            disabled={exporting}
          >
            <Download size={14} /> {exporting ? "Exporting…" : "Export CSV"}
          </button>
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <Printer size={14} /> Export Report
          </button>
        </div>
      </div>

      <div className="print-only report-header">
        <div className="report-title">
          Bauchi State Voter Registration — Analytics Report
        </div>
        <div className="report-subtitle">
          Generated {new Date().toLocaleString()}
        </div>
      </div>

      {/* KPI cards */}
      <div className="summary-grid mb-4">
        <div className="summary-card info">
          <div className="summary-label">Total Registrations</div>
          <div className="summary-value">
            {kpi?.total_registrations?.toLocaleString()}
          </div>
        </div>
        <div className="summary-card success">
          <div className="summary-label">Today</div>
          <div className="summary-value">{kpi?.today}</div>
          <div
            className={`summary-change ${
              kpi?.day_over_day_change >= 0 ? "text-success" : "text-danger"
            }`}
          >
            {kpi?.day_over_day_change > 0 ? "+" : ""}
            {kpi?.day_over_day_change}% vs yesterday
          </div>
        </div>
        <div className="summary-card warning">
          <div className="summary-label">This Week</div>
          <div className="summary-value">{kpi?.this_week}</div>
        </div>
        <div className="summary-card danger">
          <div className="summary-label">Top Agent Today</div>
          <div className="summary-value text-sm">
            {kpi?.top_agent_today?.name || "—"}
          </div>
          <div className="summary-change">
            {kpi?.top_agent_today?.count || 0} registrations
          </div>
        </div>
      </div>

      {/* Registration trend with granularity toggle */}
      <div className="card mb-4">
        <div className="card-header">
          <div className="card-title">Registration Trend</div>
          <div className="report-toggle no-print">
            {["daily", "weekly", "monthly"].map((g) => (
              <button
                key={g}
                className={granularity === g ? "active" : ""}
                onClick={() => setGranularity(g)}
              >
                {g[0].toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
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

      <div className="charts-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Completion Distribution</div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={completionData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
              >
                {completionData.map((_, i) => (
                  <Cell key={i} fill={COMPLETION_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Gender Breakdown</div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={gender}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="count"
                nameKey="gender"
                label
              >
                {gender.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Age Distribution</div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={age}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--info)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Today's Hourly Activity</div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={hourly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar
                dataKey="count"
                fill="var(--primary)"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="card-header">
            <div className="card-title">Agent Trends (Last 7 Days)</div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={trends.dates.map((d, i) => {
                const obj = { date: d };
                trends.agents.slice(0, 5).forEach((a) => {
                  obj[a.agent_name] = a.daily[i]?.count || 0;
                });
                return obj;
              })}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              {trends.agents.slice(0, 5).map((a, i) => (
                <Line
                  key={a.agent_id}
                  type="monotone"
                  dataKey={a.agent_name}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card mt-4">
        <div className="card-header">
          <div className="card-title">LGA Rankings</div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>LGA</th>
              <th>PUs</th>
              <th>Registered</th>
              <th>Target</th>
              <th>Completion</th>
            </tr>
          </thead>
          <tbody>
            {lgaRankings.map((l, i) => (
              <tr key={l.id}>
                <td className="font-bold">{i + 1}</td>
                <td className="font-semibold">{l.name}</td>
                <td>{l.pu_count}</td>
                <td>{l.registered}</td>
                <td>{l.target}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="progress-bar" style={{ width: 100 }}>
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${Math.min(l.completion, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs">{l.completion}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
