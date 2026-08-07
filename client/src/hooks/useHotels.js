import { useEffect, useState } from "react";

const API_BASE = "http://localhost:5000/api/hotels";

export function useHotels(filters) {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchHotels() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filters.minPrice) params.set("minPrice", filters.minPrice);
        if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
        if (filters.types?.length) params.set("type", filters.types.join(","));
        if (filters.amenities?.length)
          params.set("amenities", filters.amenities.join(","));

        const res = await fetch(`${API_BASE}?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to load hotels.");
        const data = await res.json();
        setHotels(data.hotels);
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchHotels();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.minPrice,
    filters.maxPrice,
    filters.types?.join(","),
    filters.amenities?.join(","),
  ]);

  return { hotels, loading, error };
}
