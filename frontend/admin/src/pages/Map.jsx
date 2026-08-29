import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useAuth } from "../hooks/useAuth";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom colored markers
const createColoredIcon = (color) =>
  L.divIcon({
    className: "custom-marker",
    html: `<div style="
    width: 24px; height: 24px; 
    background: ${color}; 
    border-radius: 50%; 
    border: 3px solid white; 
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    display: flex; align-items: center; justify-content: center;
  "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });

const statusColors = {
  not_started: "#9ca3af",
  in_progress: "#f59e0b",
  completed: "#16a34a",
};

const statusLabels = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Target Reached",
};

// Map bounds fitter
function MapBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(
        points.map((p) => [p.latitude, p.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [points, map]);
  return null;
}

export default function Map() {
  const { api } = useAuth();
  const [pollingUnits, setPollingUnits] = useState([]);
  const [selectedPU, setSelectedPU] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [lgaFilter, setLgaFilter] = useState("");

  useEffect(() => {
    fetchPollingUnits();
  }, [filter, lgaFilter]);

  const fetchPollingUnits = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.append("status", filter);
      if (lgaFilter) params.append("lga_id", lgaFilter);

      const res = await api.get(`/map/polling-units?${params}`);
      setPollingUnits(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPUDetail = async (id) => {
    try {
      const res = await api.get(`/map/polling-units/${id}`);
      setSelectedPU(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const center =
    pollingUnits.length > 0
      ? [pollingUnits[0].latitude, pollingUnits[0].longitude]
      : [10.3158, 9.8442]; // Bauchi center

  const filteredPUs = pollingUnits;

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">Polling Unit Map</h1>

      <div className="filters-bar mb-4">
        <select
          className="select"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <button className="btn btn-secondary" onClick={fetchPollingUnits}>
          Refresh
        </button>
        <div className="flex gap-3 items-center ml-auto">
          <div className="flex items-center gap-1 text-xs">
            <span
              style={{
                width: 12,
                height: 12,
                background: "#9ca3af",
                borderRadius: "50%",
                display: "inline-block",
              }}
            ></span>
            Not Started
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span
              style={{
                width: 12,
                height: 12,
                background: "#f59e0b",
                borderRadius: "50%",
                display: "inline-block",
              }}
            ></span>
            In Progress
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span
              style={{
                width: 12,
                height: 12,
                background: "#16a34a",
                borderRadius: "50%",
                display: "inline-block",
              }}
            ></span>
            Completed
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="map-container" style={{ height: "600px" }}>
              <MapContainer
                center={center}
                zoom={10}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapBounds points={filteredPUs} />
                {filteredPUs.map((pu) => (
                  <Marker
                    key={pu.id}
                    position={[pu.latitude, pu.longitude]}
                    icon={createColoredIcon(statusColors[pu.status])}
                    eventHandlers={{
                      click: () => fetchPUDetail(pu.id),
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: 200 }}>
                        <div className="font-semibold text-sm">{pu.name}</div>
                        <div className="text-xs text-gray-500">{pu.code}</div>
                        <div className="text-xs text-gray-500">
                          {pu.ward}, {pu.lga}
                        </div>
                        <div className="mt-2 flex justify-between text-xs">
                          <span>Target: {pu.target}</span>
                          <span>Registered: {pu.registered}</span>
                        </div>
                        <div className="mt-1">
                          <span
                            className={`badge badge-${
                              pu.status === "completed"
                                ? "green"
                                : pu.status === "in_progress"
                                ? "yellow"
                                : "gray"
                            }`}
                          >
                            {statusLabels[pu.status]}
                          </span>
                        </div>
                        <div className="mt-2 text-xs font-semibold text-primary">
                          {pu.completion}%
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        </div>

        {selectedPU && (
          <div style={{ width: 320 }}>
            <div className="card">
              <div className="card-header">
                <div className="card-title">PU Details</div>
                <button
                  onClick={() => setSelectedPU(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="mb-3">
                <div className="text-sm font-semibold">{selectedPU.name}</div>
                <div className="text-xs text-gray-500">{selectedPU.code}</div>
                <div className="text-xs text-gray-500">
                  {selectedPU.location}
                </div>
              </div>

              <div className="mb-3">
                <div className="text-xs text-gray-500 uppercase font-semibold">
                  Hierarchy
                </div>
                <div className="text-sm">
                  {selectedPU.lga} → {selectedPU.ward}
                </div>
              </div>

              <div className="mb-3">
                <div className="text-xs text-gray-500 uppercase font-semibold">
                  Progress
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span>Target: {selectedPU.target}</span>
                  <span className="font-semibold">{selectedPU.registered}</span>
                </div>
                <div className="progress-bar mt-1">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${Math.min(selectedPU.completion, 100)}%`,
                    }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {selectedPU.completion}% complete
                </div>
              </div>

              <div className="mb-3">
                <div className="text-xs text-gray-500 uppercase font-semibold">
                  Current Agent
                </div>
                {selectedPU.current_agent ? (
                  <div className="text-sm">
                    <div className="font-medium">
                      {selectedPU.current_agent.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      Since{" "}
                      {new Date(
                        selectedPU.current_agent.assigned_at
                      ).toLocaleDateString()}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">No agent assigned</div>
                )}
              </div>

              <div>
                <div className="text-xs text-gray-500 uppercase font-semibold mb-2">
                  Recent Registrations
                </div>
                {selectedPU.recent_registrations?.length > 0 ? (
                  selectedPU.recent_registrations.map((r) => (
                    <div
                      key={r.id}
                      className="flex justify-between text-xs py-1 border-b border-gray-100"
                    >
                      <span>{r.full_name}</span>
                      <span className="text-gray-400">
                        {new Date(r.registered_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-400">
                    No registrations yet
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
