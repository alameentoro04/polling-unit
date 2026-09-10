import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { useAuth } from "../hooks/useAuth";
import { useLocations } from "../hooks/useLocations";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const BAUCHI_BOUNDS = [
  [8.7, 8.1],
  [13.2, 11.5],
];

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

const escapeHtml = (str) =>
  String(str ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ])
  );

function coloredDivIcon(color) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: 22px; height: 22px;
      background: ${color};
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -11],
  });
}

function ClusteredMarkers({ points, onSelect }) {
  const map = useMap();
  const clusterGroupRef = useRef(null);

  // Initialize MarkerClusterGroup once per map lifespan
  useEffect(() => {
    const clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
    });

    clusterGroupRef.current = clusterGroup;
    map.addLayer(clusterGroup);

    return () => {
      map.removeLayer(clusterGroup);
    };
  }, [map]);

  // Update layer content safely when data changes
  useEffect(() => {
    const clusterGroup = clusterGroupRef.current;
    if (!clusterGroup) return;

    clusterGroup.clearLayers();

    // Filter out invalid coordinates
    const validPoints = points.filter(
      (pu) =>
        pu.latitude != null &&
        pu.longitude != null &&
        !isNaN(pu.latitude) &&
        !isNaN(pu.longitude)
    );

    const markers = validPoints.map((pu) => {
      const marker = L.marker([pu.latitude, pu.longitude], {
        icon: coloredDivIcon(
          statusColors[pu.status] || statusColors.not_started
        ),
      });

      const approxNote = pu.is_location_precise
        ? ""
        : `<div style="color:#b45309;font-size:11px;margin-top:2px;">Approximate location — not geocoded in source data</div>`;

      marker.bindPopup(`
        <div style="min-width:200px">
          <div style="font-weight:600;font-size:13px;">${escapeHtml(
            pu.name
          )}</div>
          <div style="font-size:11px;color:#6b7280;">${escapeHtml(
            pu.code
          )}</div>
          <div style="font-size:11px;color:#6b7280;">${escapeHtml(
            pu.ward
          )}, ${escapeHtml(pu.lga)}</div>
          <div style="margin-top:6px;display:flex;justify-content:space-between;font-size:11px;">
            <span>Target: ${pu.target ?? 0}</span>
            <span>Registered: ${pu.registered ?? 0}</span>
          </div>
          <div style="margin-top:4px;font-size:11px;font-weight:600;">${
            pu.completion ?? 0
          }% — ${statusLabels[pu.status] || ""}</div>
          ${approxNote}
        </div>
      `);

      marker.on("click", () => onSelect(pu.id));
      return marker;
    });

    clusterGroup.addLayers(markers);

    if (validPoints.length > 0) {
      const bounds = L.latLngBounds(
        validPoints.map((p) => [p.latitude, p.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [points, map, onSelect]);

  return null;
}

export default function Map() {
  const { api } = useAuth();
  const {
    lgas,
    wards,
    pollingUnits: puOptions,
    loadWards,
    loadPollingUnits,
  } = useLocations();
  const [pollingUnits, setPollingUnits] = useState([]);
  const [selectedPU, setSelectedPU] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [lgaFilter, setLgaFilter] = useState("");
  const [wardFilter, setWardFilter] = useState("");
  const [puFilter, setPuFilter] = useState("");

  useEffect(() => {
    fetchPollingUnits();
  }, [filter, lgaFilter, wardFilter, puFilter]);

  const handleLgaChange = (value) => {
    setLgaFilter(value);
    setWardFilter("");
    setPuFilter("");
    loadWards(value);
  };

  const handleWardChange = (value) => {
    setWardFilter(value);
    setPuFilter("");
    loadPollingUnits(value);
  };

  const fetchPollingUnits = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.append("status", filter);
      if (lgaFilter) params.append("lga_id", lgaFilter);
      if (wardFilter) params.append("ward_id", wardFilter);
      if (puFilter) params.append("polling_unit_id", puFilter);

      const res = await api.get(`/map/polling-units?${params}`);
      setPollingUnits(res.data);
    } catch (e) {
      console.error("Failed to load polling units:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPUDetail = async (id) => {
    try {
      const res = await api.get(`/map/polling-units/${id}`);
      setSelectedPU(res.data);
    } catch (e) {
      console.error("Failed to fetch polling unit details:", e);
    }
  };

  const center = [10.3158, 9.8442];

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">Polling Unit Map</h1>

      <div className="filters-bar mb-4">
        <select
          className="select"
          value={lgaFilter}
          onChange={(e) => handleLgaChange(e.target.value)}
        >
          <option value="">All LGAs</option>
          {lgas.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={wardFilter}
          onChange={(e) => handleWardChange(e.target.value)}
          disabled={!lgaFilter}
        >
          <option value="">All Wards</option>
          {wards.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={puFilter}
          onChange={(e) => setPuFilter(e.target.value)}
          disabled={!wardFilter}
        >
          <option value="">All Polling Units</option>
          {puOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
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
        <div
          style={{
            fontSize: "0.75rem",
            color: "var(--gray-500)",
            display: "flex",
            alignItems: "center",
          }}
        >
          {loading
            ? "Loading…"
            : `${pollingUnits.length.toLocaleString()} polling units`}
        </div>
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
            marginLeft: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              fontSize: "0.75rem",
            }}
          >
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              fontSize: "0.75rem",
            }}
          >
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              fontSize: "0.75rem",
            }}
          >
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

      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 0%", minWidth: 0 }}>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div
              className="map-container"
              style={{ height: "600px", width: "100%" }}
            >
              <MapContainer
                center={center}
                zoom={9}
                minZoom={8}
                maxBounds={BAUCHI_BOUNDS}
                maxBoundsViscosity={1.0}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ClusteredMarkers
                  points={pollingUnits}
                  onSelect={fetchPUDetail}
                />
              </MapContainer>
            </div>
          </div>
        </div>

        {selectedPU && (
          <div style={{ width: 320, flex: "0 0 320px" }}>
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
                {!selectedPU.is_location_precise && (
                  <div className="text-xs mt-1" style={{ color: "#b45309" }}>
                    Approximate location — not geocoded in source data
                  </div>
                )}
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
                  <span>Target: {selectedPU.target ?? 0}</span>
                  <span className="font-semibold">
                    {selectedPU.registered ?? 0}
                  </span>
                </div>
                <div className="progress-bar mt-1">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${Math.min(selectedPU.completion ?? 0, 100)}%`,
                    }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {selectedPU.completion ?? 0}% complete
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
