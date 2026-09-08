import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import SkeletonCard from "../components/SkeletonCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

const COLORS = [
  "#1a5f2a",
  "#f59e0b",
  "#dc2626",
  "#2563eb",
  "#7c3aed",
  "#0891b2",
];

export default function Analytics() {
  const { api } = useAuth();
  const [kpi, setKpi] = useState(null);
  const [gender, setGender] = useState([]);
  const [age, setAge] = useState([]);
  const [hourly, setHourly] = useState([]);
  const [trends, setTrends] = useState({ dates: [], agents: [] });
  const [lgaRankings, setLgaRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [kpiRes, genderRes, ageRes, hourlyRes, trendsRes, lgaRes] =
      await Promise.all([
        api.get("/analytics/kpi"),
        api.get("/analytics/gender"),
        api.get("/analytics/age"),
        api.get("/analytics/hourly"),
        api.get("/analytics/trends"),
        api.get("/analytics/lga-rankings"),
      ]);
    setKpi(kpiRes.data);
    setGender(genderRes.data);
    setAge(ageRes.data);
    setHourly(hourlyRes.data);
    setTrends(trendsRes.data);
    setLgaRankings(lgaRes.data);
    setLoading(false);
  };

  if (loading)
    return (
      <div>
        <h1 className="text-lg font-bold mb-4">Analytics</h1>
        <div className="charts-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">Advanced Analytics</h1>

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

      <div className="charts-grid">
        {/* Gender breakdown */}
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

        {/* Age distribution */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Age Distribution</div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={age}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly heatmap */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Today's Hourly Activity</div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={hourly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#1a5f2a" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Agent trends */}
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
              <CartesianGrid strokeDasharray="3 3" />
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

      {/* LGA rankings table */}
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
