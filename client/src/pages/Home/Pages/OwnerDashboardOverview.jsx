import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaClipboardList,
  FaCalendarCheck,
  FaCalendarTimes,
  FaWallet,
  FaHome,
  FaUsers,
  FaExclamationTriangle,
} from "react-icons/fa";
import "../../../styles/Owner/OwnerDashboard.css";

function todayDateOnly() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDateOnly(isoString) {
  if (!isoString) return null;
  const [year, month, day] = isoString.split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isSameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function nightsBetween(checkInIso, checkOutIso) {
  const a = parseDateOnly(checkInIso);
  const b = parseDateOnly(checkOutIso);
  if (!a || !b) return 0;
  const diff = Math.round((b - a) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

function monthKey(isoString) {
  const d = parseDateOnly(isoString) || new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export default function OwnerDashboardOverview({ bookings, authToken }) {
  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    async function fetchListings() {
      if (!authToken) return;
      try {
        const res = await fetch("/api/listings/mine", {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = await res.json();
        if (res.ok) setListings(data.listings || []);
      } catch (err) {
        console.error("Failed to fetch listings for dashboard:", err);
      } finally {
        setListingsLoading(false);
      }
    }
    fetchListings();
  }, [authToken]);

  const stats = useMemo(() => {
    const today = todayDateOnly();
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);

    const confirmed = bookings.filter((b) => b.status === "confirmed");
    const pending = bookings.filter((b) => b.status === "pending");
    const declined = bookings.filter((b) => b.status === "declined");
    const cancelled = bookings.filter((b) => b.status === "cancelled");

    const todayCheckIns = confirmed.filter((b) =>
      isSameDay(parseDateOnly(b.checkIn), today),
    );
    const todayCheckOuts = confirmed.filter((b) =>
      isSameDay(parseDateOnly(b.checkOut), today),
    );
    const upcomingCheckIns = confirmed
      .filter((b) => {
        const ci = parseDateOnly(b.checkIn);
        return ci && ci >= today && ci <= in7Days;
      })
      .sort((a, b) => parseDateOnly(a.checkIn) - parseDateOnly(b.checkIn));

    const depositsCollected = confirmed.reduce(
      (sum, b) => sum + Number(b.depositAmount || 0),
      0,
    );
    const totalExpected = confirmed.reduce(
      (sum, b) => sum + Number(b.totalPrice || 0),
      0,
    );

    const earningsByMonthMap = {};
    confirmed.forEach((b) => {
      const key = monthKey(b.checkIn || b.createdAt);
      earningsByMonthMap[key] =
        (earningsByMonthMap[key] || 0) + Number(b.totalPrice || 0);
    });
    const earningsByMonth = Object.entries(earningsByMonthMap)
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .slice(-6);
    const maxMonthEarning = Math.max(1, ...earningsByMonth.map(([, v]) => v));

    const perListingMap = {};
    bookings.forEach((b) => {
      if (!perListingMap[b.listingId]) {
        perListingMap[b.listingId] = {
          listingId: b.listingId,
          listingTitle: b.listingTitle,
          bookingCount: 0,
          revenue: 0,
          activeConfirmedCount: 0,
        };
      }
      perListingMap[b.listingId].bookingCount += 1;
      if (b.status === "confirmed") {
        perListingMap[b.listingId].revenue += Number(b.totalPrice || 0);
        const ci = parseDateOnly(b.checkIn);
        const co = parseDateOnly(b.checkOut);
        if (ci && co && ci <= today && today <= co) {
          perListingMap[b.listingId].activeConfirmedCount += 1;
        }
      }
    });
    const perListing = Object.values(perListingMap).sort(
      (a, b) => b.revenue - a.revenue,
    );

    const occupancyByListing = listings.map((listing) => {
      const agg = perListingMap[listing.id];
      const activeCount = agg?.activeConfirmedCount || 0;
      const capacity = Number(listing.totalRoomsAvailable || 0);
      const occupancyRate =
        capacity > 0
          ? Math.min(100, Math.round((activeCount / capacity) * 100))
          : null;
      return {
        listingId: listing.id,
        title: listing.title,
        capacity,
        activeCount,
        occupancyRate,
      };
    });
    const lowAvailability = occupancyByListing.filter(
      (l) => l.capacity > 0 && l.capacity - l.activeCount <= 1,
    );

    const guestMap = {};
    bookings.forEach((b) => {
      const key = b.guestContact || b.guestName;
      if (!key) return;
      if (!guestMap[key]) {
        guestMap[key] = {
          name: b.guestName,
          contact: b.guestContact,
          count: 0,
        };
      }
      guestMap[key].count += 1;
    });
    const repeatGuests = Object.values(guestMap)
      .filter((g) => g.count > 1)
      .sort((a, b) => b.count - a.count);
    const totalUniqueGuests = Object.keys(guestMap).length;

    const avgBookingValue =
      confirmed.length > 0 ? Math.round(totalExpected / confirmed.length) : 0;

    const avgNights =
      confirmed.length > 0
        ? (
            confirmed.reduce(
              (sum, b) => sum + nightsBetween(b.checkIn, b.checkOut),
              0,
            ) / confirmed.length
          ).toFixed(1)
        : 0;

    const recentActivity = [...bookings]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 6);

    const activeListingsCount = listings.filter(
      (l) => l.status === "active",
    ).length;
    const inactiveListingsCount = listings.filter(
      (l) => l.status !== "active",
    ).length;

    return {
      pendingCount: pending.length,
      confirmedCount: confirmed.length,
      declinedCount: declined.length,
      cancelledCount: cancelled.length,
      todayCheckIns,
      todayCheckOuts,
      upcomingCheckIns,
      depositsCollected,
      totalExpected,
      earningsByMonth,
      maxMonthEarning,
      perListing,
      occupancyByListing,
      lowAvailability,
      repeatGuests,
      totalUniqueGuests,
      avgBookingValue,
      avgNights,
      recentActivity,
      activeListingsCount,
      inactiveListingsCount,
      totalListingsCount: listings.length,
    };
  }, [bookings, listings]);

  return (
    <div className="od-dashboard">
      <h2 className="od-section-title">Overview</h2>

      <div className="od-stat-grid">
        <div
          className={`od-stat-card od-stat-card-clickable ${
            stats.pendingCount > 0 ? "od-stat-alert" : ""
          }`}
          role="button"
          tabIndex={0}
          onClick={() => navigate("/owner/bookings?status=pending")}
          onKeyDown={(e) => {
            if (e.key === "Enter") navigate("/owner/bookings?status=pending");
          }}
        >
          <FaClipboardList className="od-stat-icon" />
          <div>
            <span className="od-stat-value">{stats.pendingCount}</span>
            <span className="od-stat-label">Needs your attention</span>
          </div>
        </div>

        <div className="od-stat-card">
          <FaCalendarCheck className="od-stat-icon" />
          <div>
            <span className="od-stat-value">{stats.todayCheckIns.length}</span>
            <span className="od-stat-label">Check-ins today</span>
          </div>
        </div>

        <div className="od-stat-card">
          <FaCalendarTimes className="od-stat-icon" />
          <div>
            <span className="od-stat-value">{stats.todayCheckOuts.length}</span>
            <span className="od-stat-label">Check-outs today</span>
          </div>
        </div>

        <div className="od-stat-card">
          <FaWallet className="od-stat-icon" />
          <div>
            <span className="od-stat-value">
              ₱{stats.depositsCollected.toLocaleString()}
            </span>
            <span className="od-stat-label">Deposits collected</span>
          </div>
        </div>

        <div className="od-stat-card">
          <FaHome className="od-stat-icon" />
          <div>
            <span className="od-stat-value">{stats.totalListingsCount}</span>
            <span className="od-stat-label">
              {stats.activeListingsCount} active · {stats.inactiveListingsCount}{" "}
              inactive
            </span>
          </div>
        </div>

        <div className="od-stat-card">
          <FaUsers className="od-stat-icon" />
          <div>
            <span className="od-stat-value">{stats.totalUniqueGuests}</span>
            <span className="od-stat-label">
              {stats.repeatGuests.length} repeat guest
              {stats.repeatGuests.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {stats.lowAvailability.length > 0 && (
        <div className="od-alert-banner">
          <FaExclamationTriangle />
          <span>
            {stats.lowAvailability.length} listing
            {stats.lowAvailability.length > 1 ? "s are" : " is"} almost sold
            out: {stats.lowAvailability.map((l) => l.title).join(", ")}
          </span>
        </div>
      )}

      <div className="od-grid-2">
        <div className="od-panel">
          <h3>Upcoming Check-ins (7 days)</h3>
          {stats.upcomingCheckIns.length === 0 ? (
            <p className="od-empty">No check-ins in the next 7 days.</p>
          ) : (
            <ul className="od-list">
              {stats.upcomingCheckIns.map((b) => (
                <li key={b.id}>
                  <span>{b.guestName}</span>
                  <span className="od-list-sub">
                    {b.roomName} ·{" "}
                    {parseDateOnly(b.checkIn).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="od-panel">
          <h3>Booking Status</h3>
          <div className="od-status-breakdown">
            <div className="od-status-row">
              <span className="mb-status mb-status-pending">Pending</span>
              <span>{stats.pendingCount}</span>
            </div>
            <div className="od-status-row">
              <span className="mb-status mb-status-confirmed">Confirmed</span>
              <span>{stats.confirmedCount}</span>
            </div>
            <div className="od-status-row">
              <span className="mb-status mb-status-declined">Declined</span>
              <span>{stats.declinedCount}</span>
            </div>
            <div className="od-status-row">
              <span className="mb-status mb-status-cancelled">Cancelled</span>
              <span>{stats.cancelledCount}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="od-grid-2">
        <div className="od-panel">
          <h3>Earnings by Month</h3>
          {stats.earningsByMonth.length === 0 ? (
            <p className="od-empty">No confirmed earnings yet.</p>
          ) : (
            <div className="od-bar-chart">
              {stats.earningsByMonth.map(([key, value]) => (
                <div className="od-bar-row" key={key}>
                  <span className="od-bar-label">{monthLabel(key)}</span>
                  <div className="od-bar-track">
                    <div
                      className="od-bar-fill"
                      style={{
                        width: `${(value / stats.maxMonthEarning) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="od-bar-value">
                    ₱{value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="od-panel">
          <h3>Revenue per Listing</h3>
          {stats.perListing.length === 0 ? (
            <p className="od-empty">No bookings yet.</p>
          ) : (
            <ul className="od-list">
              {stats.perListing.map((l) => (
                <li key={l.listingId}>
                  <span>{l.listingTitle}</span>
                  <span className="od-list-sub">
                    {l.bookingCount} booking{l.bookingCount !== 1 ? "s" : ""} ·
                    ₱{l.revenue.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="od-grid-2">
        <div className="od-panel">
          <h3>Occupancy</h3>
          {listingsLoading ? (
            <p className="od-empty">Loading…</p>
          ) : stats.occupancyByListing.length === 0 ? (
            <p className="od-empty">No listings yet.</p>
          ) : (
            <ul className="od-list">
              {stats.occupancyByListing.map((l) => (
                <li key={l.listingId}>
                  <span>{l.title}</span>
                  <span className="od-list-sub">
                    {l.occupancyRate === null
                      ? "No rooms set up"
                      : `${l.occupancyRate}% occupied (${l.activeCount}/${l.capacity})`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="od-panel">
          <h3>Averages</h3>
          <div className="od-status-row">
            <span>Average booking value</span>
            <strong>₱{stats.avgBookingValue.toLocaleString()}</strong>
          </div>
          <div className="od-status-row">
            <span>Average length of stay</span>
            <strong>
              {stats.avgNights} night{Number(stats.avgNights) !== 1 ? "s" : ""}
            </strong>
          </div>
          <div className="od-status-row">
            <span>Total expected (confirmed)</span>
            <strong>₱{stats.totalExpected.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      <div className="od-panel">
        <h3>Recent Activity</h3>
        {stats.recentActivity.length === 0 ? (
          <p className="od-empty">No bookings yet.</p>
        ) : (
          <ul className="od-list">
            {stats.recentActivity.map((b) => (
              <li key={b.id}>
                <span>
                  {b.guestName} booked {b.roomName}
                </span>
                <span className="od-list-sub">
                  <span className={`mb-status mb-status-${b.status}`}>
                    {b.status}
                  </span>{" "}
                  ·{" "}
                  {new Date(b.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {stats.repeatGuests.length > 0 && (
        <div className="od-panel">
          <h3>Repeat Guests</h3>
          <ul className="od-list">
            {stats.repeatGuests.map((g) => (
              <li key={g.contact || g.name}>
                <span>{g.name}</span>
                <span className="od-list-sub">{g.count} bookings</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
