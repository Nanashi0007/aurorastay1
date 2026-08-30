import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { clearAuth } from "../../../../../utils/storage";
import {
  FaBed,
  FaUserFriends,
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhone,
  FaChevronLeft,
  FaChevronRight,
  FaArrowLeft,
} from "react-icons/fa";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import "../../../../../styles/Owner/AccommodationDetails.css";
import Navbar from "../../../../../components/layout/Navbar";
import CompleteProfileModal from "../../../../../components/modals/ProfileModal";
import AddRoomWizard from "./AddRoomModal";
import RoomCard from "../../card/RoomCard";
import EditRoomModal from "./EditRoomModal"; // adjust path
import { API_BASE } from "../../../../../config";

const LIBRARIES = ["places"];

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "260px",
  borderRadius: "12px",
};

export default function AccommodationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [managingRoom, setManagingRoom] = useState(null);

  //nav bar
  const [showLogin, setShowLogin] = useState(false);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const [authLoading, setAuthLoading] = useState(true);

  const handleProfileComplete = (updatedUser) => {
    setUser(updatedUser);
    setShowCompleteProfile(false);
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setAuthToken(null);
    setShowUserMenu(false);
  };

  const { isLoaded: mapLoaded } = useJsApiLoader({
    id: "script-loader",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/listings/${id}/rooms`);
      const data = await res.json();
      if (res.ok) {
        setRooms(data.rooms || []);
      }
    } catch (err) {
      console.error("Failed to fetch rooms:", err);
    } finally {
      setRoomsLoading(false);
    }
  }, [id]);
  function handleRoomSaved(updatedRoom) {
    setRooms((prev) =>
      prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)),
    );
    setManagingRoom(null);
  }

  function handleRoomDeleted(roomId) {
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
    setManagingRoom(null);
  }

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
    async function loadListing() {
      const token = localStorage.getItem("token");

      try {
        const res = await fetch(`${API_BASE}/api/listings/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.message || "Failed to load this listing.");
          return;
        }

        setListing(data.listing);
      } catch (err) {
        console.error(err);
        setError("Something went wrong loading this listing.");
      } finally {
        setLoading(false);
      }
    }

    loadListing();
  }, [id]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  if (loading) return <div className="ad-loading">Loading…</div>;
  if (error) return <div className="ad-error">{error}</div>;
  if (!listing) return null;

  const media = listing.photos || [];
  const hasMedia = media.length > 0;
  const hasLocation = listing.latitude && listing.longitude;
  const currentMedia = media[mediaIndex];
  const isVideo = currentMedia?.url?.match(/\.(mp4|webm|mov)$/i);

  function goPrev() {
    setMediaIndex((i) => (i === 0 ? media.length - 1 : i - 1));
  }

  function goNext() {
    setMediaIndex((i) => (i === media.length - 1 ? 0 : i + 1));
  }

  function handleRoomAdded(newRoom) {
    setShowAddRoom(false);
    fetchRooms();
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

      <div className="ad-page">
        <button className="ad-back-btn" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back to My Listings
        </button>

        {/* --- Header --- */}
        <div className="ad-header">
          <div className="ad-header-info">
            <div className="ad-header-title-row">
              <h1>{listing.title}</h1>
              <span className={`ad-status-badge ad-status-${listing.status}`}>
                {listing.status}
              </span>
            </div>
            <div className="ad-location">
              <FaMapMarkerAlt />
              <span>
                {listing.completeAddress
                  ? `${listing.completeAddress}`
                  : `${listing.barangay}, ${listing.municipality}`}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary ad-add-room-btn"
            onClick={() => setShowAddRoom(true)}
          >
            Add Rooms
          </button>
        </div>

        {/* --- Media carousel --- */}
        {hasMedia && (
          <div className="ad-media-carousel">
            {isVideo ? (
              <video
                src={currentMedia.url}
                className="ad-media-frame"
                controls
                key={currentMedia.url}
              />
            ) : (
              <img
                src={currentMedia.url}
                alt={`${listing.title} ${mediaIndex + 1}`}
                className="ad-media-frame"
              />
            )}

            {media.length > 1 && (
              <>
                <button
                  type="button"
                  className="ad-media-nav ad-media-nav-prev"
                  onClick={goPrev}
                  aria-label="Previous"
                >
                  <FaChevronLeft />
                </button>
                <button
                  type="button"
                  className="ad-media-nav ad-media-nav-next"
                  onClick={goNext}
                  aria-label="Next"
                >
                  <FaChevronRight />
                </button>
                <div className="ad-media-counter">
                  {mediaIndex + 1} / {media.length}
                </div>
              </>
            )}
          </div>
        )}

        <div className="ad-body">
          <div className="ad-main-col">
            <section className="ad-card">
              <h3>Details</h3>
              <p className="ad-description">
                {listing.description || "No description provided."}
              </p>
            </section>

            {listing.amenities && listing.amenities.length > 0 && (
              <section className="ad-card">
                <h3>Amenities</h3>
                <div className="ad-amenities">
                  {listing.amenities.map((a) => (
                    <span key={a} className="ad-amenity-chip">
                      {a}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section className="ad-card">
              <h3>Contact</h3>
              <div className="ad-grid">
                <div className="ad-grid-item">
                  <FaEnvelope />
                  <div>
                    <small>Email</small>
                    <span>{listing.contactEmail}</span>
                  </div>
                </div>
                <div className="ad-grid-item">
                  <FaPhone />
                  <div>
                    <small>Phone</small>
                    <span>{listing.contactPhone}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {hasLocation && (
            <aside className="ad-card ad-map-card">
              <h3>Map Location</h3>
              <div className="ad-grid-item ad-map-location">
                <FaMapMarkerAlt />
                <div>
                  <small>Location</small>
                  <span>
                    {listing.barangay}, {listing.municipality}
                  </span>
                </div>
              </div>
              {mapLoaded ? (
                <GoogleMap
                  mapContainerStyle={MAP_CONTAINER_STYLE}
                  center={{
                    lat: Number(listing.latitude),
                    lng: Number(listing.longitude),
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
                      lat: Number(listing.latitude),
                      lng: Number(listing.longitude),
                    }}
                  />
                </GoogleMap>
              ) : (
                <div className="map-loading">Loading map…</div>
              )}
            </aside>
          )}
        </div>

        <section className="ad-card ad-rooms-card">
          <h3>Rooms</h3>
          {roomsLoading ? (
            <p className="ad-rooms-empty">Loading rooms…</p>
          ) : rooms.length === 0 ? (
            <p className="ad-rooms-empty">
              No rooms added yet. Click "Add Rooms" above to create one.
            </p>
          ) : (
            <div className="ad-rooms-list">
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onManage={() => setManagingRoom(room)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {showAddRoom && (
        <AddRoomWizard
          propertyId={id}
          authToken={localStorage.getItem("token")}
          onClose={() => setShowAddRoom(false)}
          onSuccess={handleRoomAdded}
        />
      )}

      {managingRoom && (
        <EditRoomModal
          propertyId={id}
          room={managingRoom}
          authToken={authToken}
          onClose={() => setManagingRoom(null)}
          onSaved={handleRoomSaved}
          onDeleted={handleRoomDeleted}
        />
      )}

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
