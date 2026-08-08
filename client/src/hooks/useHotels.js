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
        if (filters.destination) params.set("destination", filters.destination);
        if (filters.checkIn) params.set("checkIn", toDateOnly(filters.checkIn));
        if (filters.checkOut)
          params.set("checkOut", toDateOnly(filters.checkOut));
        if (filters.guests) params.set("guests", filters.guests);

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
    filters.destination,
    filters.checkIn,
    filters.checkOut,
    filters.guests,
  ]);

  return { hotels, loading, error };
}

// checkIn/checkOut arrive as Date objects from SearchBar's calendar —
// convert to a plain YYYY-MM-DD string for the query param.
function toDateOnly(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
