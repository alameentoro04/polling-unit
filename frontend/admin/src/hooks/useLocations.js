import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";

export function useLocations() {
  const { api } = useAuth();
  const [lgas, setLgas] = useState([]);
  const [wards, setWards] = useState([]);
  const [pollingUnits, setPollingUnits] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/lgas").then((res) => setLgas(res.data));
  }, [api]);

  const loadWards = useCallback(
    (lgaId) => {
      setWards([]);
      setPollingUnits([]);
      if (!lgaId) return;
      setLoading(true);
      api.get(`/lgas/${lgaId}/wards`).then((res) => {
        setWards(res.data);
        setLoading(false);
      });
    },
    [api]
  );

  const loadPollingUnits = useCallback(
    (wardId) => {
      setPollingUnits([]);
      if (!wardId) return;
      setLoading(true);
      api.get(`/wards/${wardId}/polling-units`).then((res) => {
        setPollingUnits(res.data);
        setLoading(false);
      });
    },
    [api]
  );

  return { lgas, wards, pollingUnits, loading, loadWards, loadPollingUnits };
}
