import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { clearAuth } from "../../../utils/storage";
import { authFetch } from "../../../utils/api";
import CompleteProfileModal from "../../../components/modals/ProfileModal";
import {
  FaStar,
  FaMapMarkerAlt,
  FaArrowLeft,
  FaHeart,
  FaRegHeart,
  FaShareAlt,
  FaWifi,
  FaSwimmingPool,
  FaParking,
  FaSnowflake,
  FaUtensils,
  FaTv,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaExpand,
} from "react-icons/fa";
import "../../../styles/Hotels/HotelDetails.css";
import Navbar from "../../../components/layout/Navbar";
import RoomCard from "../../Owner/components/card/GuestRoomCard";
import RoomDetailModal from "../../Owner/components/pages/components/GuestRoomDetailModal.jsx";
import ReserveModal from "../../Owner/components/pages/components/ReserveModal.jsx";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import LoginModal from "../../../components/modals/LoginModal";
import EditRoomModal from "../../Owner/components/pages/components/EditRoomModal.jsx";

const AMENITY_ICONS = {
  WiFi: FaWifi,
  "Swimming Pool": FaSwimmingPool,
  "Free Parking": FaParking,
  "Air Conditioning": FaSnowflake,
  "Breakfast Included": FaUtensils,
  TV: FaTv,
};

const LIBRARIES = ["places"];

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "260px",
  borderRadius: "12px",
};

export default function HotelDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const roomsSectionRef = useRef(null);
  const [editingRoom, setEditingRoom] = useState(null);
  const [hasPendingBooking, setHasPendingBooking] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);

  const [reservingRoom, setReservingRoom] = useState(null);

  // Gallery modal state
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [fullViewIndex, setFullViewIndex] = useState(null);

  //nav bar
  const [showLogin, setShowLogin] = useState(false);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [reviewSummary, setReviewSummary] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [loadingMoreReviews, setLoadingMoreReviews] = useState(false);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const [saved, setSaved] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const REVIEWS_PAGE_SIZE = 5;

  const handleProfileComplete = (updatedUser) => {
    setUser(updatedUser);
    setShowCompleteProfile(false);
  };

  const { isLoaded: mapLoaded } = useJsApiLoader({
    id: "script-loader",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  function scrollToRooms() {
    roomsSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function loadMoreReviews() {
    setLoadingMoreReviews(true);
    try {
      const res = await fetch(
        `/api/listings/public/${id}/reviews?limit=${REVIEWS_PAGE_SIZE}&offset=${reviews.length}`,
      );
      const data = await res.json();
      if (res.ok) {
        const updated = [...reviews, ...data.reviews];
        setReviews(updated);
        setHasMoreReviews(updated.length < reviewSummary.reviewCount);
      }
    } catch (err) {
      console.error("Failed to load more reviews:", err);
    } finally {
      setLoadingMoreReviews(false);
    }
  }

  useEffect(() => {
    async function checkSaved() {
      if (!authToken || !hotel?.id) return;
      try {
        const res = await fetch("/api/saved/ids", {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = await res.json();
        if (res.ok) {
          setSaved(data.listingIds.includes(hotel.id));
        }
      } catch (err) {
        console.error("Failed to check saved status:", err);
      }
    }

    checkSaved();
  }, [authToken, hotel?.id]);

  useEffect(() => {
    async function fetchRooms() {
      try {
        const res = await fetch(`/api/listings/${id}/rooms/public`);
        const data = await res.json();
        if (res.ok) {
          setRooms(data.rooms || []);
        }
      } catch (err) {
        console.error("Failed to fetch rooms:", err);
      } finally {
        setRoomsLoading(false);
      }
    }

    fetchRooms();
  }, [id]);

  useEffect(() => {
    async function fetchHotel() {
      try {
        const res = await fetch(`/api/listings/public/${id}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.message || "Listing not found.");
          return;
        }

        setHotel(data.listing);
      } catch (err) {
        console.error(err);
        setError("Something went wrong loading this listing.");
      } finally {
        setLoading(false);
      }
    }

    fetchHotel();
  }, [id]);

  useEffect(() => {
    if (!authToken || !hotel?.id) return;
    authFetch("/api/recently-viewed", {
      method: "POST",
      body: JSON.stringify({ listingId: hotel.id }),
    }).catch((err) => console.error("Failed to record view:", err));
  }, [authToken, hotel?.id]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (token) {
      setAuthToken(token);
    }

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error("Failed to parse stored user:", err);
      }
    }
    setAuthLoading(false);
  }, []);

  useEffect(() => {
    if (fullViewIndex === null) return;

    function handleKeyDown(e) {
      if (e.key === "ArrowLeft") goToPrevPhoto();
      if (e.key === "ArrowRight") goToNextPhoto();
      if (e.key === "Escape") setFullViewIndex(null);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullViewIndex]);

  if (loading) return <div className="hd-loading">Loading…</div>;
  if (error) return <div className="hd-error">{error}</div>;
  if (!hotel) return null;

  const images = hotel.photos?.length ? hotel.photos.map((p) => p.url) : [];
  const mainImage = images[0];
  const thumbnails = images.slice(1, 9);

  function openFullView(index) {
    setFullViewIndex(index);
  }

  function goToPrevPhoto() {
    setFullViewIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  }

  function goToNextPhoto() {
    setFullViewIndex((i) => (i === images.length - 1 ? 0 : i + 1));
  }

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setAuthToken(null);
    setShowUserMenu(false);
  };

  function handleLoginSuccess(loggedInUser, isNewUser, token) {
    setUser(loggedInUser);
    setAuthToken(token);
    if (isNewUser) {
      setShowCompleteProfile(true);
    }
  }

  async function handleToggleSave() {
    if (savingToggle) return;

    if (!authToken) {
      setShowLogin(true);
      return;
    }

    setSavingToggle(true);
    const next = !saved;
    setSaved(next); // optimistic, same as HotelCard

    try {
      const res = await fetch(`/api/saved/${hotel.id}`, {
        method: next ? "POST" : "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        setSaved(!next); // revert on failure
      }
    } catch (err) {
      console.error("Failed to toggle save:", err);
      setSaved(!next);
    } finally {
      setSavingToggle(false);
    }
  }

  async function handleShare() {
    const shareData = {
      title: hotel.title,
      text: `Check out ${hotel.title} on our site`,
      url: window.location.href,
    };

    console.log("Attempting share with:", shareData); // TEMP

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        console.log("Share succeeded"); // TEMP
        return;
      } catch (err) {
        console.log("Share failed:", err.name, err.message); // TEMP — no filtering
      }
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  }

  return (
    <>
      <Navbar
        user={user}
        authLoading={authLoading}
        showUserMenu={showUserMenu}
        setShowUserMenu={setShowUserMenu}
        userMenuRef={userMenuRef}
        onLoginClick={() => setShowLogin(true)}
        onLogout={handleLogout}
      />

      <div className="hd-page">
        <button className="hd-back-btn" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back
        </button>

        {/* --- Header --- */}
        <div className="hd-header">
          <div className="hd-header-left">
            <h1>
              {hotel.title}
              <span className="hd-type-badge">{hotel.accommodationType}</span>
            </h1>
            <div className="hd-location">
              <FaMapMarkerAlt />
              <span>
                {hotel.completeAddress
                  ? `${hotel.completeAddress}, ${hotel.barangay}, ${hotel.municipality}`
                  : `${hotel.barangay}, ${hotel.municipality}`}
              </span>
            </div>
          </div>
          <div className="hd-header-actions">
            <button
              type="button"
              className="hd-icon-btn"
              onClick={handleToggleSave}
              disabled={savingToggle}
              aria-pressed={saved}
            >
              {saved ? <FaHeart /> : <FaRegHeart />} {saved ? "Saved" : "Save"}
            </button>
            <button type="button" className="hd-icon-btn" onClick={handleShare}>
              <FaShareAlt /> {shareCopied ? "Link copied!" : "Share"}
            </button>
          </div>
        </div>

        {/* --- Gallery --- */}
        <div className="hd-gallery">
          <button
            type="button"
            className="hd-gallery-main"
            onClick={() => openFullView(0)}
          >
            <img src={mainImage} alt={hotel.title} loading="eager" />
          </button>
          <div className="hd-gallery-grid">
            {thumbnails.map((src, idx) => (
              <button
                type="button"
                className="hd-gallery-thumb"
                key={idx}
                onClick={() => openFullView(idx + 1)}
              >
                <img
                  src={src}
                  alt={`${hotel.title} photo ${idx + 2}`}
                  loading="lazy"
                />
              </button>
            ))}
          </div>

          {images.length > 1 && (
            <button
              type="button"
              className="hd-gallery-viewall"
              onClick={() => setShowAllPhotos(true)}
            >
              <FaExpand />
              View all {images.length} photos
            </button>
          )}
        </div>

        <div className="hd-body">
          {/* --- Main content --- */}
          <div className="hd-main">
            <div className="hd-amenities-strip">
              {hotel.amenities.slice(0, 5).map((a) => {
                const Icon = AMENITY_ICONS[a] || FaWifi;
                return (
                  <div className="hd-amenity-pill" key={a}>
                    <Icon />
                    <span>{a}</span>
                  </div>
                );
              })}
            </div>

            {hotel.rating && (
              <div className="hd-review-box">
                <div className="hd-review-score">
                  <FaStar />
                  {hotel.rating}
                </div>
                <div>
                  <strong>Very good</strong>
                  <div className="hd-review-count">{hotel.reviews}</div>
                </div>
              </div>
            )}

            {hotel.latitude && hotel.longitude && (
              <div className="hd-section">
                <h3>Location</h3>
                {mapLoaded ? (
                  <GoogleMap
                    mapContainerStyle={MAP_CONTAINER_STYLE}
                    center={{
                      lat: Number(hotel.latitude),
                      lng: Number(hotel.longitude),
                    }}
                    zoom={15}
                    options={{
                      streetViewControl: false,
                      mapTypeControl: false,
                      fullscreenControl: false,
                      draggable: false,
                      zoomControl: true,
                      scrollwheel: false,
                      disableDoubleClickZoom: true,
                    }}
                  >
                    <MarkerF
                      position={{
                        lat: Number(hotel.latitude),
                        lng: Number(hotel.longitude),
                      }}
                    />
                  </GoogleMap>
                ) : (
                  <div className="map-loading">Loading map…</div>
                )}
              </div>
            )}
          </div>

          {/* --- Sticky price card (fixed bottom bar on mobile) --- */}
          <aside className="hd-price-card">
            <div className="hd-price-info">
              <span className="hd-price-label">You can book as low as</span>
              <div className="hd-price-value">
                {hotel.minPricePerNight
                  ? `₱${hotel.minPricePerNight}`
                  : `₱${hotel.price}`}
              </div>
              <span className="hd-price-sub">per night</span>

              <div className="hd-price-facts">
                <span>Up to {hotel.maxGuestsAcrossRooms ?? "—"} guests</span>
                <span>{hotel.totalRoomsAvailable ?? 0} rooms available</span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary hd-book-btn"
              onClick={scrollToRooms}
            >
              Book Now
            </button>
          </aside>
        </div>

        {/* --- Reviews summary --- */}
        {!reviewsLoading && reviewSummary && reviewSummary.reviewCount > 0 && (
          <div className="hd-section hd-reviews-section">
            <h3>Guest Reviews</h3>

            <div className="hd-review-summary">
              <div className="hd-review-summary-score">
                {reviewSummary.scoreOutOf10}
              </div>
              <div>
                <div className="hd-review-summary-label">
                  {reviewSummary.scoreOutOf10 >= 9
                    ? "Exceptional"
                    : reviewSummary.scoreOutOf10 >= 8
                      ? "Excellent"
                      : reviewSummary.scoreOutOf10 >= 7
                        ? "Very Good"
                        : reviewSummary.scoreOutOf10 >= 6
                          ? "Good"
                          : "Fair"}
                </div>
                <div className="hd-review-summary-count">
                  {reviewSummary.reviewCount} review
                  {reviewSummary.reviewCount > 1 ? "s" : ""}
                </div>
              </div>
            </div>

            <div className="hd-review-list">
              {reviews.map((r, idx) => (
                <div className="hd-review-item" key={idx}>
                  <div className="hd-review-header">
                    {r.guestPicture ? (
                      <img
                        src={r.guestPicture}
                        alt={r.guestFirstName}
                        className="hd-review-avatar"
                        loading="lazy"
                      />
                    ) : (
                      <div className="hd-review-avatar hd-review-avatar-fallback">
                        {r.guestFirstName?.[0]}
                      </div>
                    )}
                    <div>
                      <div className="hd-review-author">{r.guestFirstName}</div>
                      <div className="hd-review-date">
                        {new Date(r.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="hd-review-stars">
                    {"★".repeat(r.rating)}
                    {"☆".repeat(5 - r.rating)}
                  </div>
                  {r.comment && (
                    <p className="hd-review-comment">{r.comment}</p>
                  )}
                </div>
              ))}
            </div>

            {hasMoreReviews && (
              <button
                type="button"
                className="hd-review-more-btn"
                onClick={loadMoreReviews}
                disabled={loadingMoreReviews}
              >
                {loadingMoreReviews
                  ? "Loading…"
                  : `Show more reviews (${reviewSummary.reviewCount - reviews.length} more)`}
              </button>
            )}
          </div>
        )}

        {/* --- Rooms --- */}
        <div className="hd-section hd-rooms-section" ref={roomsSectionRef}>
          <h3>Choose Your Rooms</h3>
          {roomsLoading ? (
            <p>Loading rooms…</p>
          ) : rooms.length === 0 ? (
            <p>No rooms listed yet.</p>
          ) : (
            <div className="hd-rooms-list">
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onManage={() => {
                    if (hasPendingBooking) {
                      setShowPendingModal(true);
                      return;
                    }
                    setSelectedRoom(room);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* --- "View all" grid modal --- */}
        {showAllPhotos && (
          <div
            className="hd-lightbox"
            onClick={() => setShowAllPhotos(false)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="hd-lightbox-grid"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="hd-lightbox-close"
                onClick={() => setShowAllPhotos(false)}
                aria-label="Close"
              >
                <FaTimes /> Close
              </button>
              <div className="hd-lightbox-grid-photos">
                {images.map((src, idx) => (
                  <button
                    type="button"
                    className="hd-lightbox-grid-item"
                    key={idx}
                    onClick={() => {
                      setShowAllPhotos(false);
                      openFullView(idx);
                    }}
                  >
                    <img
                      src={src}
                      alt={`${hotel.title} photo ${idx + 1}`}
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- Single full-view lightbox --- */}
        {fullViewIndex !== null && (
          <div
            className="hd-fullview"
            onClick={() => setFullViewIndex(null)}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              className="hd-fullview-close"
              onClick={() => setFullViewIndex(null)}
              aria-label="Close"
            >
              <FaTimes />
            </button>

            <button
              type="button"
              className="hd-fullview-nav hd-fullview-prev"
              onClick={(e) => {
                e.stopPropagation();
                goToPrevPhoto();
              }}
              aria-label="Previous photo"
            >
              <FaChevronLeft />
            </button>

            <img
              src={images[fullViewIndex]}
              alt={`${hotel.title} photo ${fullViewIndex + 1}`}
              className="hd-fullview-image"
              onClick={(e) => e.stopPropagation()}
            />

            <button
              type="button"
              className="hd-fullview-nav hd-fullview-next"
              onClick={(e) => {
                e.stopPropagation();
                goToNextPhoto();
              }}
              aria-label="Next photo"
            >
              <FaChevronRight />
            </button>

            <div className="hd-fullview-counter">
              {fullViewIndex + 1} / {images.length}
            </div>
          </div>
        )}
      </div>

      <CompleteProfileModal
        isOpen={showCompleteProfile}
        token={authToken}
        initialFirstName={user?.firstName}
        initialLastName={user?.lastName}
        onComplete={handleProfileComplete}
      />

      {selectedRoom && (
        <RoomDetailModal
          room={selectedRoom}
          gcashQrUrl={hotel.gcashQrUrl}
          wiseDetails={hotel.wiseDetails}
          ownerId={hotel.ownerId}
          onManage={(room) => {
            setSelectedRoom(null);
            setEditingRoom(room);
          }}
          onClose={() => setSelectedRoom(null)}
          isLoggedIn={!!authToken}
          onRequireLogin={() => {
            setSelectedRoom(null);
            setShowLogin(true);
          }}
          authToken={authToken}
          user={user}
        />
      )}

      {editingRoom && (
        <EditRoomModal
          propertyId={hotel.id}
          room={editingRoom}
          authToken={authToken}
          onClose={() => setEditingRoom(null)}
          onSaved={(updatedRoom) => {
            setEditingRoom(null);
            setRooms((prev) =>
              prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)),
            );
          }}
          onDeleted={(roomId) => {
            setEditingRoom(null);
            setRooms((prev) => prev.filter((r) => r.id !== roomId));
          }}
        />
      )}

      {reservingRoom && (
        <ReserveModal
          room={reservingRoom}
          authToken={authToken}
          user={user}
          onClose={() => setReservingRoom(null)}
          onRequireLogin={() => {
            setReservingRoom(null);
            setShowLogin(true);
          }}
          onSuccess={() => {}}
        />
      )}

      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {showPendingModal && (
        <div
          className="hd-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowPendingModal(false)}
        >
          <div
            className="hd-pending-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>You have a booking awaiting confirmation</h3>
            <p>
              You already have a booking that hasn't been confirmed by the owner
              yet. You can book another room once that one is confirmed,
              declined, or cancelled.
            </p>
            <div className="hd-pending-modal-actions">
              <button
                type="button"
                className="btn-link"
                onClick={() => setShowPendingModal(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate("/bookings")}
              >
                View My Bookings
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
