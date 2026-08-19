import { useState } from "react";
import { getStoredAdminAuth } from "../../../../utils/storage";
import { useAnalytics } from "./useAnalytics";

const CARD_CONFIGS = {
  totalListings: {
    label: "Total listings",
    endpoint: "overview/listings",
    listKey: "listings",
  },
  activeListings: {
    label: "Active listings",
    endpoint: "overview/listings?status=active",
    listKey: "listings",
  },
  inactiveListings: {
    label: "Inactive listings",
    endpoint: "overview/listings?status=inactive",
    listKey: "listings",
  },
  totalBookings: {
    label: "Total bookings",
    endpoint: "overview/bookings",
    listKey: "bookings",
  },
  totalGuestsHosted: {
    label: "Guests hosted",
    endpoint: "overview/bookings?status=confirmed",
    listKey: "bookings",
  },
  totalOwners: {
    label: "Approved owners",
    endpoint: "overview/owners",
    listKey: "owners",
  },
  totalTourists: {
    label: "Tourists",
    endpoint: "overview/tourists",
    listKey: "tourists",
  },
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatCard({ cardKey, label, value, isActive, onClick }) {
  return (
    <button
      type="button"
      className={`stat-card stat-card-clickable ${isActive ? "is-expanded" : ""}`}
      onClick={() => onClick(cardKey)}
    >
      <span className="stat-card-label">{label}</span>
      <span className="stat-card-value">{value}</span>
    </button>
  );
}

function DetailTable({ cardKey, rows }) {
  if (!rows || rows.length === 0) {
    return <p className="analytics-empty">No records found.</p>;
  }

  if (
    cardKey === "totalListings" ||
    cardKey === "activeListings" ||
    cardKey === "inactiveListings"
  ) {
    return (
      <table className="analytics-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Type</th>
            <th>Location</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.title}</td>
              <td>{row.accommodation_type}</td>
              <td>
                {[row.barangay, row.municipality].filter(Boolean).join(", ")}
              </td>
              <td>{row.status}</td>
              <td>{formatDate(row.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (cardKey === "totalBookings" || cardKey === "totalGuestsHosted") {
    return (
      <table className="analytics-table">
        <thead>
          <tr>
            <th>Guest</th>
            <th>Listing</th>
            <th>Check-in</th>
            <th>Check-out</th>
            <th>Guests</th>
            <th>Status</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.guest_name}</td>
              <td>{row.title}</td>
              <td>{formatDate(row.check_in)}</td>
              <td>{formatDate(row.check_out)}</td>
              <td>{row.guests_count}</td>
              <td>{row.status}</td>
              <td>₱{Number(row.total_price).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (cardKey === "totalOwners") {
    return (
      <table className="analytics-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Property</th>
            <th>Type</th>
            <th>Municipality</th>
            <th>Approved since</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.full_name}</td>
              <td>{row.email}</td>
              <td>{row.accommodation_name}</td>
              <td>{row.accommodation_type}</td>
              <td>{row.municipality}</td>
              <td>{formatDate(row.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (cardKey === "totalTourists") {
    return (
      <table className="analytics-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                {[row.first_name, row.last_name].filter(Boolean).join(" ")}
              </td>
              <td>{row.email}</td>
              <td>{formatDate(row.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return null;
}

export default function OverviewTab() {
  const { data, loading, error } = useAnalytics("overview");
  const [expandedCard, setExpandedCard] = useState(null);
  const [detailRows, setDetailRows] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  async function handleCardClick(cardKey) {
    if (expandedCard === cardKey) {
      setExpandedCard(null);
      setDetailRows(null);
      return;
    }

    setExpandedCard(cardKey);
    setDetailRows(null);
    setDetailError("");
    setDetailLoading(true);

    try {
      const config = CARD_CONFIGS[cardKey];
      const { token } = getStoredAdminAuth();
      const res = await fetch(`/api/admin/analytics/${config.endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to load details.");
      setDetailRows(body[config.listKey] || []);
    } catch (err) {
      setDetailError(err.message || "Failed to load details.");
    } finally {
      setDetailLoading(false);
    }
  }

  if (loading) return <p className="analytics-loading">Loading overview…</p>;
  if (error) return <p className="analytics-error">{error}</p>;
  if (!data) return null;

  return (
    <div className="overview-tab">
      <div className="stat-grid">
        {Object.entries(CARD_CONFIGS).map(([key, config]) => (
          <StatCard
            key={key}
            cardKey={key}
            label={config.label}
            value={data[key]}
            isActive={expandedCard === key}
            onClick={handleCardClick}
          />
        ))}
      </div>

      {expandedCard && (
        <div className="stat-detail-panel">
          <h3>{CARD_CONFIGS[expandedCard].label} — full list</h3>
          {detailLoading && <p className="analytics-loading">Loading…</p>}
          {detailError && <p className="analytics-error">{detailError}</p>}
          {!detailLoading && !detailError && (
            <DetailTable cardKey={expandedCard} rows={detailRows} />
          )}
        </div>
      )}
    </div>
  );
}
