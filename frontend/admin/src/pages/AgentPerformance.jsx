import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useLocations } from "../hooks/useLocations";
import SkeletonTable from "../components/SkeletonTable";
import EmptyState from "../components/EmptyState";

const medalColors = ["#c99a3d", "#9aa0a6", "#a0673a"]; // gold, silver, bronze

function syncHealth(agent) {
  if (agent.conflicts > 2) return { label: "Needs attention", color: "red", icon: AlertTriangle };
  if (!agent.last_seen_at) return { label: "Never synced", color: "gray", icon: WifiOff };
  const hoursSince = (Date.now() - new Date(agent.last_seen_at)) / 36e5;
  if (hoursSince > 24) return { label: "Inactive", color: "gray", icon: WifiOff };
  if (agent.conflicts > 0) return { label: "Minor issues", color: "yellow", icon: AlertTriangle };
  return { label: "Healthy", color: "green", icon: Wifi };
}

function LeaderCard({ agent, rank, completion }) {
  return (
    <motion.div
      className="leader-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: rank * 0.06 }}
      whileHover={{ y: -3 }}
    >
      <div className="leader-rank" style={{ background: medalColors[rank] }}>
        {rank + 1}
      </div>
      <div className="leader-name">{agent.name}</div>
      <div className="leader-pu">{agent.polling_unit || "Unassigned"}</div>
      <div className="leader-completion">{completion}%</div>
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${Math.min(completion, 100)}%` }} />
      </div>
      <div className="leader-count">{agent.registered} / {agent.target} registered</div>
    </motion.div>
  );
}

export default function AgentPerformance() {
  const { api } = useAuth();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { lgas } = useLocations();
  const [filters, setFilters] = useState({ lga_id: "" });

  useEffect(() => {
    fetchAgents();
  }, [filters]);

  const fetchAgents = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.lga_id) params.append("lga_id", filters.lga_id);
    const res = await api.get(`/dashboard/agents?${params}`);
    setAgents(res.data);
    setLoading(false);
  };

  const withCompletion = agents.map((a) => ({
    ...a,
    completion: a.target > 0 ? Math.round((a.registered / a.target) * 100) : 0,
  }));
  const ranked = [...withCompletion].sort((a, b) => b.completion - a.completion || b.registered - a.registered);
  const top3 = ranked.slice(0, 3);

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">Agent Performance</h1>

      <div className="filters-bar mb-4">
        <select className="select" value={filters.lga_id} onChange={(e) => setFilters({ lga_id: e.target.value })}>
          <option value="">All LGAs</option>
          {lgas.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      {loading ? (
        <SkeletonTable rows={5} columns={6} />
      ) : agents.length === 0 ? (
        <div className="card">
          <EmptyState icon={Trophy} title="No agents found" description="Try a different LGA filter." />
        </div>
      ) : (
        <>
          {top3.length > 0 && (
            <div className="leaderboard-grid mb-4">
              {top3.map((agent, i) => (
                <LeaderCard key={agent.id} agent={agent} rank={i} completion={agent.completion} />
              ))}
            </div>
          )}

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Agent</th>
                    <th>Polling Unit</th>
                    <th>Registered</th>
                    <th>Completion</th>
                    <th>Sync Health</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((a, i) => {
                    const health = syncHealth(a);
                    const HealthIcon = health.icon;
                    return (
                      <tr key={a.id}>
                        <td className="text-gray-400 font-semibold">#{i + 1}</td>
                        <td className="font-semibold">{a.name}</td>
                        <td>{a.polling_unit || "—"}</td>
                        <td>{a.registered}</td>
                        <td>
                          <div className="progress-bar" style={{ width: 100, display: "inline-block" }}>
                            <div className="progress-bar-fill" style={{ width: `${Math.min(a.completion, 100)}%` }} />
                          </div>
                          <span className="text-xs ml-2">{a.completion}%</span>
                        </td>
                        <td>
                          <span className={`badge badge-${health.color}`} style={{ display: "inline-flex", gap: "0.25rem" }}>
                            <HealthIcon size={11} /> {health.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
