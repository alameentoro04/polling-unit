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
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

const COLORS = ["#1a5f2a", "#f59e0b", "#dc2626", "#2563eb", "#7c3aed"];

export default function Dashboard() {
  const { api } = useAuth();
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [lgas, setLgas] = useState([]);
  const [completion, setCompletion] = useState({});
  const [lastChecksum, setLastChecksum] = useState("");
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
  }, []);

  const loadWards = (lgaId) => {
    if (!lgaId) {
      setWards([]);
      return;
    }
    api.get(`/lgas/${lgaId}/wards`).then((res) => setWards(res.data));
  };

  const loadPollingUnits = (wardId) => {
    if (!wardId) {
      setPollingUnits([]);
      return;
    }
    api
      .get(`/wards/${wardId}/polling-units`)
      .then((res) => setPollingUnits(res.data));
  };

  useEffect(() => {
    const poll = setInterval(checkUpdates, 15000);
    checkUpdates();
    return () => clearInterval(poll);
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

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">Situation Room Dashboard</h1>

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

      {/* Summary cards */}
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-label">Total LGAs</div>
          <div className="summary-value">{summary.total_lgas}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Total Wards</div>
          <div className="summary-value">{summary.total_wards}</div>
        </div>
        <div className="summary-card info">
          <div className="summary-label">Total Registered</div>
          <div className="summary-value">
            {summary.total_registered?.toLocaleString()}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Target</div>
          <div className="summary-value">
            {summary.total_target?.toLocaleString()}
          </div>
        </div>
        <div className="summary-card success">
          <div className="summary-label">Completion</div>
          <div className="summary-value">{summary.completion_percentage}%</div>
        </div>
        <div className="summary-card warning">
          <div className="summary-label">Polling Units</div>
          <div className="summary-value">{summary.total_polling_units}</div>
        </div>
        <div className="summary-card danger">
          <div className="summary-label">Agents</div>
          <div className="summary-value">{summary.total_agents}</div>
        </div>
        <div className="summary-card info">
          <div className="summary-label">Completed PUs</div>
          <div className="summary-value">{summary.completed_polling_units}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Daily Registrations</div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#1a5f2a"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">LGA Performance</div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={lgas.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                angle={-30}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="registered" fill="#1a5f2a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="target" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">PU Completion Status</div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={completionData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
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
    </div>
  );
}
