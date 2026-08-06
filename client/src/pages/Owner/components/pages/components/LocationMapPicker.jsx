import { useCallback, useState } from "react";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";

const LIBRARIES = ["places"];

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "280px",
  borderRadius: "12px",
};

// Roughly centered on Baler, Aurora — used as the default map view
const DEFAULT_CENTER = { lat: 15.7594, lng: 121.5629 };

export default function LocationMapPicker({
  onLocationSelect,
  initialPosition,
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const [marker, setMarker] = useState(initialPosition || null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeFailed, setGeocodeFailed] = useState(false);

  const handleMapClick = useCallback(
    async (e) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setMarker({ lat, lng });
      setGeocoding(true);
      setGeocodeFailed(false);

      try {
        // Nominatim (OpenStreetMap) reverse geocoding — free, no API key/billing required.
        // Usage policy: max ~1 req/sec, custom User-Agent/Referer expected.
        // https://nominatim.org/release-docs/latest/api/Reverse/
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

        const res = await fetch(url, {
          headers: {
            // Nominatim asks apps to identify themselves. Browsers block manually
            // setting User-Agent, so Referer (sent automatically) is what they see —
            // just make sure this app is served from a real domain, not localhost only.
            Accept: "application/json",
          },
        });

        if (!res.ok) throw new Error(`Nominatim responded ${res.status}`);

        const data = await res.json();
        const addr = data.address || {};

        // OSM's address tagging is inconsistent for PH provincial areas, so we
        // fall back across several possible fields for each piece.
        const municipality =
          addr.city || addr.town || addr.municipality || addr.county || null;

        const barangay =
          addr.village ||
          addr.suburb ||
          addr.neighbourhood ||
          addr.quarter ||
          null;

        const address = data.display_name || null;

        onLocationSelect({ lat, lng, address, municipality, barangay });
      } catch (err) {
        console.error("Reverse geocoding failed:", err);
        setGeocodeFailed(true);
        onLocationSelect({
          lat,
          lng,
          address: null,
          municipality: null,
          barangay: null,
        });
      } finally {
        setGeocoding(false);
      }
    },
    [onLocationSelect],
  );

  if (loadError) {
    return (
      <div className="map-error">
        Couldn't load the map. Check your internet connection or API key.
      </div>
    );
  }

  if (!isLoaded) {
    return <div className="map-loading">Loading map…</div>;
  }

  return (
    <div className="location-map-wrap">
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={marker || DEFAULT_CENTER}
        zoom={marker ? 15 : 11}
        onClick={handleMapClick}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {marker && <MarkerF position={marker} />}
      </GoogleMap>

      <div className="map-hint">
        {geocoding
          ? "Looking up this location…"
          : geocodeFailed
            ? "Couldn't auto-detect address — please fill in the fields manually."
            : marker
              ? "Pin placed — you can click again to move it."
              : "Click anywhere on the map to drop a pin at your property."}
      </div>
    </div>
  );
}
