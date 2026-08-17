import { useAnalytics } from "./useAnalytics";
import { useIsMobile } from "./useIsMobile";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function ChartCard({ title, children }) {
  return (
    <div className="chart-card">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function formatMonth(monthString) {
  const date = new Date(monthString);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatCurrency(value) {
  return `₱${Number(value).toLocaleString()}`;
}

export default function BookingsTab() {
  const { data, loading, error } = useAnalytics("bookings");
  const isMobile = useIsMobile(560);

  if (loading)
    return <p className="analytics-loading">Loading bookings data…</p>;
  if (error) return <p className="analytics-error">{error}</p>;
  if (!data) return null;

  const trendData = data.volumeTrend.map((row) => ({
    month: formatMonth(row.month),
    count: row.count,
  }));

  const funnelData = [
    { stage: "Pending", count: data.funnel.pending },
    { stage: "Confirmed", count: data.funnel.confirmed },
    { stage: "Declined", count: data.funnel.declined },
    { stage: "Cancelled", count: data.funnel.cancelled },
  ];

  const chartHeight = isMobile ? 220 : 260;

  return (
    <div className="bookings-tab">
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-card-label">Confirmed revenue</span>
          <span className="stat-card-value">
            {formatCurrency(data.totalConfirmedRevenue)}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Confirm rate</span>
          <span className="stat-card-value">
            {data.funnel.confirmRate !== null
              ? `${data.funnel.confirmRate}%`
              : "—"}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Decline rate</span>
          <span className="stat-card-value">
            {data.funnel.declineRate !== null
              ? `${data.funnel.declineRate}%`
              : "—"}
          </span>
        </div>
      </div>

      <div className="chart-grid">
        <ChartCard title="Booking volume over time">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: isMobile ? 11 : 12 }} />
              <YAxis allowDecimals={false} width={isMobile ? 28 : 36} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="var(--navy-deep, #1e2a4a)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Booking funnel">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={funnelData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stage" tick={{ fontSize: isMobile ? 11 : 12 }} />
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

      <div className="table-grid">
        <div className="table-card">
          <h3>Top performing listings</h3>
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Listing</th>
                <th>Location</th>
                <th>Bookings</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.topListings.map((row) => (
                <tr key={row.id}>
                  <td>{row.title}</td>
                  <td>{row.location}</td>
                  <td>{row.bookingCount}</td>
                  <td>{formatCurrency(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-card">
          <h3>Top performing municipalities</h3>
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Municipality</th>
                <th>Bookings</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.topMunicipalities.map((row) => (
                <tr key={row.municipality}>
                  <td>{row.municipality}</td>
                  <td>{row.bookingCount}</td>
                  <td>{formatCurrency(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
