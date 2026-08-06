const STORAGE_KEY = "recentlyViewedHotels";
const MAX_ITEMS = 10;

export function addRecentlyViewed(hotelId) {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const filtered = stored.filter((id) => id !== hotelId);
    filtered.unshift(hotelId);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(filtered.slice(0, MAX_ITEMS)),
    );
  } catch (err) {
    console.error("Failed to save recently viewed:", err);
  }
}

export function getRecentlyViewedIds() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}
