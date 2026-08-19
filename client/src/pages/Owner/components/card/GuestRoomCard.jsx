import { useState } from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaUserFriends,
  FaBed,
  FaMapMarkerAlt,
} from "react-icons/fa";
import RoomDetailModal from "../pages/components/RoomDetailModal";
import "../../../../styles/Hotels/RoomCardDetails.css";
import "../../../../styles/GuestRoomCardDetails.css";

export default function RoomCard({ room, onManage }) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showDetail, setShowDetail] = useState(false);

  const photos = room.photos || [];
  const hasPhotos = photos.length > 0;

  const isAvailable = Number(room.roomsAvailable) > 0;

  function prevPhoto(e) {
    e.stopPropagation();
    setPhotoIndex((i) => (i === 0 ? photos.length - 1 : i - 1));
  }

  function nextPhoto(e) {
    e.stopPropagation();
    setPhotoIndex((i) => (i === photos.length - 1 ? 0 : i + 1));
  }

  // Flatten categorized amenities into a short preview list (first 4 items total)
  const amenityPreview = Object.values(room.amenities || {})
    .flat()
    .slice(0, 4);
  const amenityOverflowCount = Math.max(
    0,
    Object.values(room.amenities || {}).flat().length - amenityPreview.length,
  );

  return (
    <>
      <div className={`rc-card ${!isAvailable ? "rc-card-unavailable" : ""}`}>
        <div className="rc-image-col">
          <div className="rc-image">
            {hasPhotos ? (
              <img src={photos[photoIndex].url} alt={room.roomName} />
            ) : (
              <div className="rc-image-placeholder">No photo</div>
            )}

            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  className="rc-image-nav rc-image-nav-prev"
                  onClick={prevPhoto}
                  aria-label="Previous photo"
                >
                  <FaChevronLeft />
                </button>
                <button
                  type="button"
                  className="rc-image-nav rc-image-nav-next"
                  onClick={nextPhoto}
                  aria-label="Next photo"
                >
                  <FaChevronRight />
                </button>
                <span className="rc-photo-counter">
                  {photoIndex + 1}/{photos.length}
                </span>
              </>
            )}

            <span className="rc-guest-badge">
              <FaUserFriends /> {room.maxGuests}
            </span>

            {!isAvailable && (
              <div className="rc-sold-out-overlay">
                <span>No Rooms Left</span>
              </div>
            )}
          </div>
        </div>

        <div className="rc-info-col">
          <h4 className="rc-room-name">{room.roomName}</h4>

          <div className="rc-specs">
            {room.bedType && (
              <span className="rc-spec">
                <FaBed /> {room.bedType}
              </span>
            )}
            {room.view && (
              <span className="rc-spec">
                <FaMapMarkerAlt /> {room.view}
              </span>
            )}
            {room.roomSizeSqm && (
              <span className="rc-spec">{room.roomSizeSqm} m²</span>
            )}
            <span className="rc-spec">
              {room.smokingAllowed ? "Smoking allowed" : "Non-smoking"}
            </span>
          </div>

          {amenityPreview.length > 0 && (
            <div className="rc-amenity-preview">
              {amenityPreview.map((a) => (
                <span className="rc-amenity-tag" key={a}>
                  {a}
                </span>
              ))}
              {amenityOverflowCount > 0 && (
                <span className="rc-amenity-tag rc-amenity-more">
                  +{amenityOverflowCount} more
                </span>
              )}
            </div>
          )}

          {room.description && (
            <p className="rc-description">{room.description}</p>
          )}

          <button
            type="button"
            className="rc-detail-link"
            onClick={() => setShowDetail(true)}
          >
            {/* View more details */}
          </button>
        </div>

        <div className="rc-price-col">
          <div className="rc-price">
            ₱{Number(room.pricePerNight).toLocaleString()}
            <small className="rc-price-note">per night</small>
            {isAvailable ? (
              <div className="rc-availability">
                {room.roomsAvailable} room{room.roomsAvailable > 1 ? "s" : ""}{" "}
                available
              </div>
            ) : (
              <div className="rc-availability rc-availability-none">
                No rooms left
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn btn-primary rc-manage-btn"
            onClick={() => onManage?.(room)}
            disabled={!isAvailable}
          >
            {isAvailable ? "Book" : "Sold Out"}
          </button>
        </div>
      </div>

      {showDetail && (
        <RoomDetailModal
          room={room}
          initialPhotoIndex={photoIndex}
          onClose={() => setShowDetail(false)}
          onManage={onManage}
        />
      )}
    </>
  );
}
