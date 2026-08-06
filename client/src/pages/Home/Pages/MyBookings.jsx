import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";

import "../../../styles/MyBookings.css"; // adjust path to match your structure
import Navbar from "../components/Navbar";
import CompleteProfileModal from "../ProfileModal";
import { getRecentlyViewedIds } from "../../../utils/recentlyViewed";

import {
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaSuitcaseRolling,
  FaHeart,
  FaHistory,
  FaHotel,
  FaBed,
  FaHome,
  FaStar,
  FaChevronRight,
} from "react-icons/fa";

const TYPE_ICONS = {
  Hotel: FaHotel,
  Inn: FaBed,
  Homestay: FaHome,
};

const STATUS_LABELS = {
  pending: "Awaiting Confirmation",
  confirmed: "Confirmed",
  declined: "Declined",
  cancelled: "Cancelled",
};

const TYPE_FILTERS = ["All", "Hotel", "Inn", "Homestay"];

function parseDateOnly(isoString) {
  // Build the date from its Y-M-D parts directly, so the calendar date
  // shown always matches what's stored -- no shifting from timezone conversion.
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

function ratingLabel(score) {
  if (score == null) return "";
  if (score >= 9) return "Excellent";
  if (score >= 8) return "Very Good";
  if (score >= 7) return "Good";
  if (score >= 6) return "Pleasant";
  return "Fair";
}

// Booking.com-style horizontal row card for a single recently viewed hotel.
function RecentlyViewedRow({ hotel }) {
  // Core fields, matching what QuickBookCard uses.
  const image = hotel.image;
  const name = hotel.name;
  const price = hotel.price;

  // Optional detail fields — your hotel objects may not include these yet.
  // Checking a couple of likely key names so this renders if they exist
  // under a slightly different name, without breaking if they don't.
  const location = hotel.location || hotel.address || hotel.city;
  const distanceToCenter = hotel.distanceToCenter || hotel.distance;
  const starRating = hotel.starRating || hotel.stars;
  const accommodationType = hotel.accommodationType || hotel.type;
  const rating = hotel.rating || hotel.score;
  const reviewCount = hotel.reviewCount || hotel.ratingsCount;

  const stars = Math.round(starRating || 0);
  // Price may come as a number, or as a formatted string like "3,245" or
  // "₱3,245" — strip anything that isn't a digit or decimal point first.
  const numericPrice =
    typeof price === "string"
      ? Number(price.replace(/[^0-9.]/g, ""))
      : Number(price);
  const hasValidPrice = price != null && Number.isFinite(numericPrice);

  const TypeIcon = accommodationType ? TYPE_ICONS[accommodationType] : null;

  return (
    <Link to={`/listing/${hotel.id}`} className="rv-row">
      <div className="rv-row-photo">
        {image ? (
          <img src={image} alt={name} />
        ) : (
          <div className="rv-row-photo-placeholder">No photo</div>
        )}
        {accommodationType && (
          <span className="rv-row-type-badge">
            {TypeIcon && <TypeIcon />}
            {accommodationType}
          </span>
        )}
      </div>

      <div className="rv-row-main">
        <h3 className="rv-row-title">{name}</h3>

        {stars > 0 && (
          <div className="rv-row-stars" aria-label={`${stars} star`}>
            {Array.from({ length: stars }).map((_, i) => (
              <FaStar key={i} />
            ))}
          </div>
        )}

        {location && (
          <p className="rv-row-location">
            {location}
            {distanceToCenter && `, ${distanceToCenter} to city center`}
          </p>
        )}

        {rating != null && (
          <div className="rv-row-rating">
            <span className="rv-row-score">{Number(rating).toFixed(1)}</span>
            <span className="rv-row-score-label">{ratingLabel(rating)}</span>
            {reviewCount != null && (
              <span className="rv-row-review-count">
                ({Number(reviewCount).toLocaleString()} ratings)
              </span>
            )}
          </div>
        )}
      </div>

      <div className="rv-row-side">
        <p className="rv-row-price">
          {hasValidPrice ? (
            <>
              ₱{numericPrice.toLocaleString()}
              <span className="rv-row-price-unit"> / night</span>
            </>
          ) : (
            <span className="rv-row-price-unavailable">Price unavailable</span>
          )}
        </p>
        <span className="rv-row-cta">
          See prices <FaChevronRight />
        </span>
      </div>
    </Link>
  );
}

export default function MyBookings() {
  const navigate = useNavigate();
  const [upcoming, setUpcoming] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // "upcoming" | "history" | "recentlyViewed"
  const [activeTab, setActiveTab] = useState("upcoming");
  const [typeFilter, setTypeFilter] = useState("All");

  // --- Recently Viewed state ---
  // Recently viewed hotel IDs live in localStorage (see utils/recentlyViewed.js).
  // We resolve them against the full hotels list, same pattern as Hero.jsx.
  const [allHotels, setAllHotels] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState(null);
  const [recentLoaded, setRecentLoaded] = useState(false); // fetch hotels once, lazily

  const recentlyViewedIds = getRecentlyViewedIds();
  const recentlyViewedHotels = recentlyViewedIds
    .map((id) => allHotels.find((h) => h.id === id))
    .filter(Boolean);

  const [showLogin, setShowLogin] = useState(false);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setAuthToken(null);
    setShowUserMenu(false);
  }

  function handleProfileComplete(updatedUser) {
    setUser(updatedUser);
    setShowCompleteProfile(false);
  }

  // Restore the logged-in state on page load / refresh.
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

  useEffect(() => {
    async function fetchBookings() {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/");
        return;
      }

      try {
        const [upcomingRes, historyRes] = await Promise.all([
          fetch("/api/bookings/upcoming", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/bookings/history", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const upcomingData = await upcomingRes.json();
        const historyData = await historyRes.json();

        if (!upcomingRes.ok) {
          setError(upcomingData.message || "Failed to load bookings.");
          return;
        }
        if (!historyRes.ok) {
          setError(historyData.message || "Failed to load bookings.");
          return;
        }

        setUpcoming(upcomingData.bookings || []);
        setHistory(historyData.bookings || []);
      } catch (err) {
        console.error(err);
        setError("Something went wrong loading your bookings.");
      } finally {
        setLoading(false);
      }
    }

    fetchBookings();
  }, [navigate]);

  // Fetch the hotels list the first time the Recently Viewed tab is opened,
  // then resolve it against the IDs stored in localStorage (recentlyViewedIds above).
  async function handleRecentlyViewedClick() {
    setActiveTab("recentlyViewed");

    if (recentLoaded) return; // already fetched once, don't refetch every click

    setRecentLoading(true);
    setRecentError(null);

    try {
      const res = await fetch("/api/hotels");
      const data = await res.json();

      if (!res.ok) {
        setRecentError(
          data.message || "Failed to load recently viewed listings.",
        );
        return;
      }

      setAllHotels(data.hotels || data || []);
      setRecentLoaded(true);
    } catch (err) {
      console.error(err);
      setRecentError("Something went wrong loading recently viewed listings.");
    } finally {
      setRecentLoading(false);
    }
  }

  const byTab =
    activeTab === "upcoming"
      ? upcoming
      : activeTab === "history"
        ? history
        : [];

  const visible =
    typeFilter === "All" || activeTab === "recentlyViewed"
      ? byTab
      : byTab.filter((b) => b.accommodationType === typeFilter);

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

      <div className="mb-layout">
        {/* --- Left sidebar --- */}
        <aside className="mb-sidebar">
          <div className="mb-sidebar-group">
            <span className="mb-sidebar-parent">
              <FaSuitcaseRolling /> My Booking
            </span>
            <nav className="mb-sidebar-sublist">
              {TYPE_FILTERS.map((type) => (
                <button
                  type="button"
                  key={type}
                  className={`mb-sidebar-sublink ${
                    activeTab !== "recentlyViewed" && typeFilter === type
                      ? "active"
                      : ""
                  }`}
                  onClick={() => {
                    setTypeFilter(type);
                    if (activeTab === "recentlyViewed")
                      setActiveTab("upcoming");
                  }}
                >
                  {type}
                </button>
              ))}
            </nav>
          </div>

          <Link to="/saved" className="mb-sidebar-toplink">
            <FaHeart /> Saved
          </Link>
          <button
            type="button"
            className={`mb-sidebar-toplink ${
              activeTab === "recentlyViewed" ? "active" : ""
            }`}
            onClick={handleRecentlyViewedClick}
          >
            <FaHistory /> Recently Viewed
          </button>
        </aside>

        {/* --- Main content --- */}
        <div className="mb-page">
          <h1>
            {activeTab === "recentlyViewed" ? "Recently Viewed" : "My Bookings"}
          </h1>

          {activeTab === "recentlyViewed" ? (
            recentLoading ? (
              <div className="mb-loading">Loading recently viewed…</div>
            ) : recentError ? (
              <div className="mb-error">{recentError}</div>
            ) : recentlyViewedHotels.length === 0 ? (
              <div className="mb-empty">
                <FaHistory className="mb-empty-icon" />
                <p>Listings you view will show up here.</p>
              </div>
            ) : (
              <div className="rv-list">
                {recentlyViewedHotels.map((hotel) => (
                  <RecentlyViewedRow hotel={hotel} key={hotel.id} />
                ))}
              </div>
            )
          ) : loading ? (
            <div className="mb-loading">Loading your bookings…</div>
          ) : error ? (
            <div className="mb-error">{error}</div>
          ) : (
            <>
              <div className="mb-tabs">
                <button
                  type="button"
                  className={`mb-tab ${activeTab === "upcoming" ? "active" : ""}`}
                  onClick={() => setActiveTab("upcoming")}
                >
                  Upcoming ({upcoming.length})
                </button>
                <button
                  type="button"
                  className={`mb-tab ${activeTab === "history" ? "active" : ""}`}
                  onClick={() => setActiveTab("history")}
                >
                  History ({history.length})
                </button>
              </div>

              {visible.length === 0 ? (
                <div className="mb-empty">
                  <FaSuitcaseRolling className="mb-empty-icon" />
                  <p>
                    {typeFilter === "All"
                      ? activeTab === "upcoming"
                        ? "No upcoming bookings yet."
                        : "No past bookings."
                      : `No ${typeFilter.toLowerCase()} bookings in this tab.`}
                  </p>
                </div>
              ) : (
                <div className="mb-list">
                  {visible.map((booking) => {
                    const nights = nightsBetween(
                      booking.checkIn,
                      booking.checkOut,
                    );
                    return (
                      <div className="mb-card" key={booking.id}>
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
                          <p className="mb-listing-title">
                            {booking.listingTitle}
                          </p>
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
                        </div>

                        <div className="mb-card-side">
                          <span
                            className={`mb-status mb-status-${booking.status}`}
                          >
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
            </>
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
    </>
  );
}
