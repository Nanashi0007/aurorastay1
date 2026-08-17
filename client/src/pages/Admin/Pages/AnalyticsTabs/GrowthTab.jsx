import { useAnalytics } from "./useAnalytics";
import { useIsMobile } from "./useIsMobile";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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

function mergeSeries(seriesA, keyA, seriesB, keyB) {
  const map = new Map();

  seriesA.forEach((row) => {
    const label = formatMonth(row.month);
    map.set(label, { month: label, [keyA]: row.count });
  });

  seriesB.forEach((row) => {
    const label = formatMonth(row.month);
    const existing = map.get(label) || { month: label };
    existing[keyB] = row.count;
    map.set(label, existing);
  });

  return Array.from(map.values());
}

export default function GrowthTab() {
  const { data, loading, error } = useAnalytics("growth");
  const isMobile = useIsMobile(560);

  if (loading) return <p className="analytics-loading">Loading growth data…</p>;
  if (error) return <p className="analytics-error">{error}</p>;
  if (!data) return null;

  const signupsData = mergeSeries(
    data.userSignups,
    "users",
    data.ownerSignups,
    "owners",
  );

  const listingsData = data.listingCreation.map((row) => ({
    month: formatMonth(row.month),
    count: row.count,
  }));

  const chartHeight = isMobile ? 240 : 280;

  return (
    <div className="growth-tab">
      <div className="chart-grid">
        <ChartCard title="New signups over time">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={signupsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: isMobile ? 11 : 12 }} />
              <YAxis allowDecimals={false} width={isMobile ? 28 : 36} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: isMobile ? 12 : 13 }} />
              <Line
                type="monotone"
                dataKey="users"
                name="All users"
                stroke="var(--navy-deep, #1e2a4a)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="owners"
                name="Approved owners"
                stroke="var(--gold-deep, #c9962f)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="New listings created over time">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={listingsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: isMobile ? 11 : 12 }} />
              <YAxis allowDecimals={false} width={isMobile ? 28 : 36} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                name="New listings"
                stroke="var(--gold-deep, #c9962f)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
