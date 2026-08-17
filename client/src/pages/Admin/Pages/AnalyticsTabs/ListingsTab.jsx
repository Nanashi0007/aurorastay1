import { useAnalytics } from "./useAnalytics";
import { useIsMobile } from "./useIsMobile";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const defaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ChartCard({ title, children }) {
  return (
    <div className="chart-card">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export default function ListingsTab() {
  const { data, loading, error } = useAnalytics("listings");
  const isMobile = useIsMobile(560);

  if (loading)
    return <p className="analytics-loading">Loading listings data…</p>;
  if (error) return <p className="analytics-error">{error}</p>;
  if (!data) return null;

  const topLocations = data.byLocation.slice(0, 10).map((row) => ({
    name: [row.barangay, row.municipality].filter(Boolean).join(", "),
    count: row.count,
  }));

  const topAmenities = data.byAmenity.slice(0, 10);

  const mapCenter =
    data.mapPoints.length > 0
      ? [data.mapPoints[0].latitude, data.mapPoints[0].longitude]
      : [15.7594, 121.5629];

  const chartHeight = isMobile ? 220 : 260;

  return (
    <div className="listings-tab">
      <div className="chart-grid">
        <ChartCard title="Listings by accommodation type">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={data.byType}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" tick={{ fontSize: isMobile ? 11 : 12 }} />
              <YAxis allowDecimals={false} width={isMobile ? 28 : 36} />
              <Tooltip />
              <Bar
                dataKey="count"
                fill="var(--gold-deep, #c9962f)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top locations (barangay, municipality)">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={topLocations}
              layout="vertical"
              margin={{ left: isMobile ? 8 : 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: isMobile ? 10 : 12 }}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={isMobile ? 90 : 140}
                tick={{ fontSize: isMobile ? 9 : 11 }}
              />
              <Tooltip />
              <Bar
                dataKey="count"
                fill="var(--navy-deep, #1e2a4a)"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Most popular amenities">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={topAmenities}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="amenity"
                tick={{ fontSize: isMobile ? 10 : 11 }}
                interval={0}
                angle={isMobile ? -35 : -20}
                textAnchor="end"
                height={isMobile ? 70 : 60}
              />
              <YAxis allowDecimals={false} width={isMobile ? 28 : 36} />
              <Tooltip />
              <Bar
                dataKey="count"
                fill="var(--gold-deep, #c9962f)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="chart-card map-card">
        <h3>All listings map</h3>
        <MapContainer
          center={mapCenter}
          zoom={isMobile ? 7 : 9}
          scrollWheelZoom={false}
          style={{
            height: isMobile ? "280px" : "420px",
            width: "100%",
            borderRadius: "10px",
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {data.mapPoints.map((point) => (
            <Marker
              key={point.id}
              position={[point.latitude, point.longitude]}
              icon={defaultIcon}
            >
              <Popup>
                <strong>{point.title}</strong>
                <br />
                {point.type} — {point.location}
                <br />
                Status: {point.status}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
