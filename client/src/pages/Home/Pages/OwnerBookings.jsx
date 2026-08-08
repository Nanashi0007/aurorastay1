import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaPlus,
  FaHome,
  FaClipboardList,
  FaEnvelope,
  FaWallet,
  FaCog,
  FaSignOutAlt,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaHotel,
  FaBed,
} from "react-icons/fa";
import Navbar from "../components/Navbar";
import CompleteProfileModal from "../ProfileModal";
import BookingDetailModal from "../components/BookingDetailModal"; // adjust path to match where you save it
import "../../../styles/Owner/OwnerListings.css";

const NAV_ITEMS = [
  {
    id: "listings",
    label: "My Listings",
    icon: FaHome,
    path: "/owner/listings",
  },
  {
    id: "bookings",
    label: "Bookings",
    icon: FaClipboardList,
    path: "/owner/bookings",
  },
  {
    id: "messages",
    label: "Messages",
    icon: FaEnvelope,
    path: "/owner/messages",
  },
  {
    id: "earnings",
    label: "Earnings",
    icon: FaWallet,
    path: "/owner/earnings",
  },
  { id: "settings", label: "Settings", icon: FaCog, path: "/owner/settings" },
];

const TYPE_ICONS = {
  Hotel: FaHotel,
  Inn: FaBed,
  Homestay: FaHome,
};

// Same statuses as MyBookings.jsx, but "pending" reads as "Pending" here
// since this is the owner's side — they're the one who needs to act on it.
const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  declined: "Declined",
  cancelled: "Cancelled",
};

function parseDateOnly(isoString) {
  const [year, month, day] = isoString.split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateRange(checkInIso, checkOutIso) {
  if (!checkInIso || !checkOutIso) return "";
  const checkIn = parseDateOnly(checkInIso);
  const checkOut = parseDateOnly(checkOutIso);

  const checkInLabel = checkIn.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const checkOutLabel = checkOut.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${checkInLabel} – ${checkOutLabel}`;
}

function nightsBetween(checkInIso, checkOutIso) {
  if (!checkInIso || !checkOutIso) return 0;
  const diff = Math.round(
    (parseDateOnly(checkOutIso) - parseDateOnly(checkInIso)) /
      (1000 * 60 * 60 * 24),
  );
  return diff > 0 ? diff : 0;
}

export default function OwnerBookings() {
  const navigate = useNavigate();
  const location = useLocation();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showLogin, setShowLogin] = useState(false);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    async function fetchOwnerBookings() {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/");
        return;
      }

      try {
        const res = await fetch("/api/bookings/owner", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.message || "Failed to load bookings.");
          return;
        }

        setBookings(data.bookings || []);
      } catch (err) {
        console.error(err);
        setError("Something went wrong loading your bookings.");
      } finally {
        setLoading(false);
      }
    }

    fetchOwnerBookings();
  }, [navigate]);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      try {
        setAuthToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setAuthToken(null);
    setShowUserMenu(false);
    navigate("/");
  };

  const handleProfileComplete = (updatedUser) => {
    setUser(updatedUser);
    setShowCompleteProfile(false);
  };

  function handleBookingStatusUpdated(bookingId, newStatus) {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b)),
    );
  }

  return (
    <>
      <Navbar
        user={user}
        showUserMenu={showUserMenu}
        setShowUserMenu={setShowUserMenu}
        userMenuRef={userMenuRef}
        onLoginClick={() => setShowLogin(true)}
        onLogout={handleLogout}
      />

      <div className="owner-layout">
        <aside className="owner-sidebar">
          <nav className="owner-sidebar-nav">
            {NAV_ITEMS.map(({ id, label, icon: Icon, path }) => (
              <button
                type="button"
                key={id}
                className={`owner-sidebar-link ${
                  location.pathname === path ? "active" : ""
                }`}
                onClick={() => navigate(path)}
              >
                <Icon />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          {user && (
            <div className="owner-sidebar-account">
              <div className="owner-sidebar-avatar">
                {user.picture ? (
                  <img src={user.picture} alt="" />
                ) : (
                  <span>{user.firstName?.[0] || "?"}</span>
                )}
              </div>
              <div className="owner-sidebar-account-info">
                <span className="owner-sidebar-account-name">
                  {user.firstName} {user.lastName}
                </span>
                <button
                  type="button"
                  className="owner-sidebar-logout"
                  onClick={handleLogout}
                >
                  <FaSignOutAlt /> Logout
                </button>
              </div>
            </div>
          )}
        </aside>

        <div className="owner-listings-wrap">
          <div className="owner-listings-header">
            <div>
              <h1>Bookings</h1>
              <p className="owner-listings-subtitle">
                Bookings guests have made on your listings.
              </p>
            </div>
          </div>

          {loading ? (
            <p className="mb-loading">Loading bookings…</p>
          ) : error ? (
            <div className="mb-error">{error}</div>
          ) : bookings.length === 0 ? (
            <div className="owner-listings-empty">
              <FaClipboardList />
              <h2>No bookings yet</h2>
              <p>Bookings guests make will show up here.</p>
            </div>
          ) : (
            <div className="mb-list">
              {bookings.map((booking) => {
                const nights = nightsBetween(booking.checkIn, booking.checkOut);
                return (
                  <div
                    className="mb-card"
                    key={booking.id}
                    onClick={() => setSelectedBooking(booking)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="mb-card-photo">
                      {booking.coverPhotoUrl ? (
                        <img
                          src={booking.coverPhotoUrl}
                          alt={booking.listingTitle}
                        />
                      ) : (
                        <div className="mb-card-photo-placeholder">
                          No photo
                        </div>
                      )}
                      {booking.accommodationType && (
                        <span className="mb-card-type-badge">
                          {TYPE_ICONS[booking.accommodationType] &&
                            (() => {
                              const Icon =
                                TYPE_ICONS[booking.accommodationType];
                              return <Icon />;
                            })()}
                          {booking.accommodationType}
                        </span>
                      )}
                    </div>

                    <div className="mb-card-main">
                      <h3>{booking.roomName}</h3>
                      <p className="mb-listing-title">{booking.listingTitle}</p>
                      {booking.location && (
                        <p className="mb-location">
                          <FaMapMarkerAlt /> {booking.location}
                        </p>
                      )}
                      <p className="mb-dates">
                        <FaCalendarAlt />{" "}
                        {formatDateRange(booking.checkIn, booking.checkOut)}
                        {nights > 0 && (
                          <span className="mb-nights">
                            {" "}
                            · {nights} night{nights > 1 ? "s" : ""}
                          </span>
                        )}
                      </p>
                      <p className="mb-guests">
                        {booking.guestsCount} guest
                        {booking.guestsCount > 1 ? "s" : ""}
                      </p>
                      {booking.guestName && (
                        <p className="mb-guest-name">
                          Booked by {booking.guestName}
                        </p>
                      )}
                    </div>

                    <div className="mb-card-side">
                      <span className={`mb-status mb-status-${booking.status}`}>
                        {STATUS_LABELS[booking.status] || booking.status}
                      </span>
                      <p className="mb-price">
                        ₱{Number(booking.totalPrice).toLocaleString()}
                      </p>
                      <p className="mb-deposit">
                        Deposit paid: ₱
                        {Number(booking.depositAmount).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <CompleteProfileModal
        isOpen={showCompleteProfile}
        token={authToken}
        initialFirstName={user?.firstName}
        initialLastName={user?.lastName}
        onComplete={handleProfileComplete}
      />

      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          authToken={authToken}
          onClose={() => setSelectedBooking(null)}
          onStatusUpdated={handleBookingStatusUpdated}
        />
      )}
    </>
  );
}
