import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import Navbar from "../../../../Home/components/Navbar";
import CompleteProfileModal from "../../../../Home/ProfileModal";
import AddRoomWizard from "./AddRoomModal";
import RoomCard from "../../card/RoomCard";
import EditRoomModal from "./EditRoomModal"; // adjust path

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

  const handleProfileComplete = (updatedUser) => {
    setUser(updatedUser);
    setShowCompleteProfile(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setAuthToken(null);
    setShowUserMenu(false);
  };

  const { isLoaded: mapLoaded } = useJsApiLoader({
    id: "script-loader",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  // fetchRooms lives at component level so both the useEffect below
  // and handleRoomAdded (after adding a new room) can call it.
  async function fetchRooms() {
    try {
      const res = await fetch(`/api/listings/${id}/rooms`);
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
  }, []);

  useEffect(() => {
    async function loadListing() {
      const token = localStorage.getItem("token");

      try {
        const res = await fetch(`/api/listings/${id}`, {
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
  }, [id]);

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
        <button
          className="btn btn-primary"
          onClick={() => setShowAddRoom(true)}
        >
          Add Rooms
        </button>
        {/* --- Header --- */}
        <div className="ad-header">
          <div>
            <h1>{listing.title}</h1>
            <div className="ad-location">
              <FaMapMarkerAlt />
              <span>
                {listing.completeAddress
                  ? `${listing.completeAddress}`
                  : `${listing.barangay}, ${listing.municipality}`}
              </span>
            </div>
          </div>
          <span className={`ad-status-badge ad-status-${listing.status}`}>
            {listing.status}
          </span>
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

        {media.length > 1 && (
          <div className="ad-media-thumbs">
            {media.map((item, idx) => (
              <button
                type="button"
                key={item.url}
                className={`ad-media-thumb-btn ${idx === mediaIndex ? "active" : ""}`}
                onClick={() => setMediaIndex(idx)}
              >
                <img src={item.url} alt="" />
              </button>
            ))}
          </div>
        )}

        <div className="ad-body">
          {/* --- Main content --- */}
          <div className="ad-section-no-margin">
            <div className="ad-room-card-header">
              <h3>Details</h3>
              <p>{listing.description || "No description provided."}</p>
            </div>

            <div className="dividers"></div>

            {listing.amenities && listing.amenities.length > 0 && (
              <div className="ad-section">
                <h3>Amenities</h3>
                <div className="ad-amenities">
                  {listing.amenities.map((a) => (
                    <span key={a} className="ad-amenity-chip">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="dividers"></div>

            <div className="ad-section">
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
            </div>
          </div>

          <div className="dividerss"></div>
          {hasLocation && (
            <div className="ad-section ">
              <div className="ad-grid">
                <h3>Map Location</h3>
                <div className="ad-grid-item">
                  <FaMapMarkerAlt />
                  <div>
                    <small>Location</small>
                    <span>
                      {listing.barangay}, {listing.municipality}
                    </span>
                  </div>
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
            </div>
          )}
        </div>

        <div className="dividers"></div>

        <div className="ad-section ">
          <h3>Rooms</h3>
          {roomsLoading ? (
            <p>Loading rooms…</p>
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
        </div>
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
