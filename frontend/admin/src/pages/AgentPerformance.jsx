import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useLocations } from "../hooks/useLocations";

export default function AgentPerformance() {
  const { api } = useAuth();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { lgas, loadWards } = useLocations();
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

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">Agent Performance</h1>

      <div className="filters-bar mb-4">
        <select
          className="select"
          value={filters.lga_id}
          onChange={(e) => {
            setFilters({ lga_id: e.target.value });
          }}
        >
          <option value="">All LGAs</option>
          {lgas.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        {loading ? (
          <div className="text-center p-4">Loading...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Polling Unit</th>
                <th>Registered</th>
                <th>Completion</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => {
                const completion =
                  a.target > 0
                    ? Math.round((a.registered / a.target) * 100)
                    : 0;
                return (
                  <tr key={a.id}>
                    <td className="font-semibold">{a.name}</td>
                    <td>{a.polling_unit || "—"}</td>
                    <td>{a.registered}</td>
                    <td>
                      <div
                        className="progress-bar"
                        style={{ width: 120, display: "inline-block" }}
                      >
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${Math.min(completion, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs ml-2">{completion}%</span>
                    </td>
                    <td>
                      <span
                        className={`badge badge-${
                          completion >= 100
                            ? "green"
                            : completion > 0
                            ? "yellow"
                            : "gray"
                        }`}
                      >
                        {completion >= 100
                          ? "Complete"
                          : completion > 0
                          ? "In Progress"
                          : "Not Started"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
