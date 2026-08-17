import { useState, useEffect } from "react";

export function useAnalytics(endpoint) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem("token");

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/admin/analytics/${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.message || "Failed to load data.");
        if (!cancelled) setData(body);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  return { data, loading, error };
}
