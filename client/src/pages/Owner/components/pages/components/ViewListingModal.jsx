import "../../../../../styles/Owner/ViewListing.css";
import { useState } from "react";
import {
  FaTimes,
  FaBed,
  FaUserFriends,
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhone,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";

const LIBRARIES = ["places"];

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "220px",
  borderRadius: "12px",
};

export default function ViewListingModal({ listing, onClose }) {
  const [mediaIndex, setMediaIndex] = useState(0);

  const { isLoaded } = useJsApiLoader({
    id: "script-loader",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const media = listing.photos || [];
  const hasMedia = media.length > 0;
  const hasLocation = listing.latitude && listing.longitude;

  function goPrev() {
    setMediaIndex((i) => (i === 0 ? media.length - 1 : i - 1));
  }

  function goNext() {
    setMediaIndex((i) => (i === media.length - 1 ? 0 : i + 1));
  }

  const currentMedia = media[mediaIndex];
  const isVideo = currentMedia?.url?.match(/\.(mp4|webm|mov)$/i);

  return (
    <div className="wizard-overlay" role="dialog" aria-modal="true">
      <div className="wizard-modal view-listing-modal">
        <div className="wizard-header">
          <span className="wizard-header-title">{listing.title}</span>
          <button
            type="button"
            className="wizard-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        <div className="wizard-body">
          {/* --- Media carousel --- */}
          {hasMedia && (
            <div className="view-media-carousel">
              {isVideo ? (
                <video
                  src={currentMedia.url}
                  className="view-media-frame"
                  controls
                  key={currentMedia.url}
                />
              ) : (
                <img
                  src={currentMedia.url}
                  alt={`${listing.title} ${mediaIndex + 1}`}
                  className="view-media-frame"
                />
              )}

              {media.length > 1 && (
                <>
                  <button
                    type="button"
                    className="view-media-nav view-media-nav-prev"
                    onClick={goPrev}
                    aria-label="Previous"
                  >
                    <FaChevronLeft />
                  </button>
                  <button
                    type="button"
                    className="view-media-nav view-media-nav-next"
                    onClick={goNext}
                    aria-label="Next"
                  >
                    <FaChevronRight />
                  </button>
                  <div className="view-media-counter">
                    {mediaIndex + 1} / {media.length}
                  </div>
                </>
              )}
            </div>
          )}

          {media.length > 1 && (
            <div className="view-media-thumbs">
              {media.map((item, idx) => (
                <button
                  type="button"
                  key={item.url}
                  className={`view-media-thumb-btn ${idx === mediaIndex ? "active" : ""}`}
                  onClick={() => setMediaIndex(idx)}
                >
                  <img src={item.url} alt="" />
                </button>
              ))}
            </div>
          )}

          {/* --- Details --- */}
          <div className="view-listing-section">
            <h4>Details</h4>
            <p>{listing.description || "No description provided."}</p>
          </div>

          <div className="view-listing-grid">
            <div className="view-listing-item">
              <FaBed />
              <div>
                <small>Room Type</small>
                <span>{listing.roomType}</span>
              </div>
            </div>
            <div className="view-listing-item">
              <FaUserFriends />
              <div>
                <small>Max Guests</small>
                <span>{listing.maxGuests}</span>
              </div>
            </div>
            <div className="view-listing-item">
              <FaMapMarkerAlt />
              <div>
                <small>Location</small>
                <span>
                  {listing.barangay}, {listing.municipality}
                </span>
              </div>
            </div>
          </div>

          {/* --- Map (view-only) --- */}
          {hasLocation && (
            <div className="view-listing-section">
              <h4>Map Location</h4>
              {isLoaded ? (
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

          {/* --- Amenities --- */}
          {listing.amenities && listing.amenities.length > 0 && (
            <div className="view-listing-section">
              <h4>Amenities</h4>
              <div className="view-listing-amenities">
                {listing.amenities.map((a) => (
                  <span key={a} className="view-listing-amenity-chip">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* --- Contact info --- */}
          <div className="view-listing-section">
            <h4>Contact</h4>
            <div className="view-listing-grid">
              <div className="view-listing-item">
                <FaEnvelope />
                <div>
                  <small>Email</small>
                  <span>{listing.contactEmail}</span>
                </div>
              </div>
              <div className="view-listing-item">
                <FaPhone />
                <div>
                  <small>Phone</small>
                  <span>{listing.contactPhone}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="view-listing-price">
            ₱{Number(listing.pricePerNight).toLocaleString()}{" "}
            <small>/ night</small>
          </div>
        </div>
      </div>
    </div>
  );
}
