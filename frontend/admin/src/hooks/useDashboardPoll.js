import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export function useDashboardPoll(token) {
  const [data, setData] = useState(null);
  const checksumRef = useRef(null);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await axios.get(`${API_URL}/dashboard/checksum`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.checksum !== checksumRef.current) {
          checksumRef.current = res.data.checksum;
          const summary = await axios.get(`${API_URL}/dashboard/summary`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setData(summary.data);
        }
      } catch (e) {
        console.error("Poll error:", e);
      }
    };

    check();
    const interval = setInterval(check, 15000); // 15 seconds
    return () => clearInterval(interval);
  }, [token]);

  return data;
}
