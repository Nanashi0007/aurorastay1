import { useEffect, useMemo, useState } from "react";

const API_BASE = "/api/hotels";

export function useHotels(filters) {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const normalizedFilters = useMemo(
    () => ({
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      types: filters.types?.join(",") ?? "",
      amenities: filters.amenities?.join(",") ?? "",
      destination: filters.destination,
      checkIn: filters.checkIn,
      checkOut: filters.checkOut,
      guests: filters.guests,
    }),
    [
      filters.minPrice,
      filters.maxPrice,
      filters.types,
      filters.amenities,
      filters.destination,
      filters.checkIn,
      filters.checkOut,
      filters.guests,
    ],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function fetchHotels() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (normalizedFilters.minPrice)
          params.set("minPrice", normalizedFilters.minPrice);
        if (normalizedFilters.maxPrice)
          params.set("maxPrice", normalizedFilters.maxPrice);
        if (normalizedFilters.types) params.set("type", normalizedFilters.types);
        if (normalizedFilters.amenities)
          params.set("amenities", normalizedFilters.amenities);
        if (normalizedFilters.destination)
          params.set("destination", normalizedFilters.destination);
        if (normalizedFilters.checkIn)
          params.set("checkIn", toDateOnly(normalizedFilters.checkIn));
        if (normalizedFilters.checkOut)
          params.set("checkOut", toDateOnly(normalizedFilters.checkOut));
        if (normalizedFilters.guests)
          params.set("guests", normalizedFilters.guests);

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
  }, [normalizedFilters]);

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
