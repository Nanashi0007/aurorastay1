import { useState, useEffect } from "react";
import {
  FaTimes,
  FaArrowLeft,
  FaChevronRight,
  FaTh,
  FaCheck,
} from "react-icons/fa";
import "../../../../../styles/Hotels/RoomCardDetails.css";
import { useBodyScrollLock } from "../../../../../hooks/useBodyScrollLock";

import ReserveForm from "./ReserveForm"; // adjust path to match where you save it

const CATEGORY_LABELS = {
  bathroom: "Bathroom",
  room_amenities: "Room Amenities",
  media_technology: "Media and Technology",
  general_amenities: "General Amenities",
  cleaning_services: "Cleaning Services",
  toiletries: "Toiletries",
  internet: "Internet and Communications",
  food_drink: "Food and Drink",
};

export default function RoomDetailModal({
  room,
  gcashQrUrl,
  wiseDetails,
  initialPhotoIndex = 0,
  onClose,
  isLoggedIn,
  onRequireLogin,
  authToken,
  user,
  ownerId,
  onManage,
}) {
  const [photoIndex, setPhotoIndex] = useState(initialPhotoIndex);
  const [showAllPhotosGrid, setShowAllPhotosGrid] = useState(false);
  const [showReserveForm, setShowReserveForm] = useState(false);
  const [reserveSuccess, setReserveSuccess] = useState(false);

  const photos = room.photos || [];
  const hasPhotos = photos.length > 0;

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const isOwner = isLoggedIn && user?.id != null && user.id === ownerId;

  function nextPhoto() {
    setPhotoIndex((i) => (i === photos.length - 1 ? 0 : i + 1));
  }

  const amenityCategories = Object.entries(room.amenities || {}).filter(
    ([, items]) => items && items.length > 0,
  );

  function handleReserveClick() {
    if (!isLoggedIn) {
      onRequireLogin?.();
      return;
    }
    setShowReserveForm(true);
  }

  return (
    <div
      className="rd-overlay"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="rd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rd-topbar">
          {showAllPhotosGrid ? (
            <button
              type="button"
              className="rd-back-link"
              onClick={() => setShowAllPhotosGrid(false)}
            >
              <FaArrowLeft /> Back to Album
            </button>
          ) : showReserveForm ? (
            <button
              type="button"
              className="rd-back-link"
              onClick={() => setShowReserveForm(false)}
            >
              <FaArrowLeft /> Back to Room
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            className="rd-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        <div className="rd-body">
          <div className="rd-photo-col">
            {showAllPhotosGrid ? (
              <div className="rd-photos-grid">
                {photos.map((photo, idx) => (
                  <button
                    type="button"
                    key={idx}
                    className="rd-photos-grid-item"
                    onClick={() => {
                      setPhotoIndex(idx);
                      setShowAllPhotosGrid(false);
                    }}
                  >
                    <img src={photo.url} alt={`${room.roomName} ${idx + 1}`} />
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="rd-main-photo">
                  {hasPhotos ? (
                    <img src={photos[photoIndex].url} alt={room.roomName} />
                  ) : (
                    <div className="rd-photo-placeholder">
                      No photo available
                    </div>
                  )}

                  {photos.length > 1 && (
                    <>
                      <button
                        type="button"
                        className="rd-photo-nav"
                        onClick={nextPhoto}
                        aria-label="Next photo"
                      >
                        <FaChevronRight />
                      </button>
                      <span className="rd-photo-counter">
                        {photoIndex + 1}/{photos.length}
                      </span>
                    </>
                  )}
                </div>

                {photos.length > 1 && (
                  <div className="rd-thumb-strip">
                    <button
                      type="button"
                      className="rd-thumb rd-thumb-all"
                      onClick={() => setShowAllPhotosGrid(true)}
                    >
                      <FaTh />
                      <span>{photos.length}</span>
                    </button>
                    {photos.map((photo, idx) => (
                      <button
                        type="button"
                        key={idx}
                        className={`rd-thumb ${idx === photoIndex ? "active" : ""}`}
                        onClick={() => setPhotoIndex(idx)}
                      >
                        <img src={photo.url} alt="" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="rd-details-col">
            {reserveSuccess ? (
              <div className="rd-reserve-success">
                <h3>Booking Requested</h3>
                <p>
                  Your request for <strong>{room.roomName}</strong> has been
                  sent. You'll be notified once the owner confirms it.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onClose}
                >
                  Done
                </button>
              </div>
            ) : showReserveForm ? (
              <div className="rd-details-scroll">
                <h3 className="rd-room-title">Reserve — {room.roomName}</h3>
                <p className="rd-reserve-sub">₱{room.pricePerNight} / night</p>
                <ReserveForm
                  room={room}
                  gcashQrUrl={gcashQrUrl}
                  wiseDetails={wiseDetails}
                  authToken={authToken}
                  user={user}
                  onCancel={() => setShowReserveForm(false)}
                  onSuccess={() => setReserveSuccess(true)}
                  onRequireLogin={onRequireLogin}
                />
              </div>
            ) : (
              <>
                <div className="rd-details-scroll">
                  <h3 className="rd-room-title">{room.roomName}</h3>

                  <div className="rd-specs-row">
                    {room.bedType && <span>{room.bedType}</span>}
                    {room.roomSizeSqm && <span>{room.roomSizeSqm} m²</span>}
                    {room.floorRange && <span>Floor: {room.floorRange}</span>}
                    <span>
                      {room.smokingAllowed ? "Smoking allowed" : "Non-smoking"}
                    </span>
                  </div>

                  {amenityCategories.map(([key, items]) => (
                    <div className="rd-amenity-category" key={key}>
                      <h4>{CATEGORY_LABELS[key] || key}</h4>
                      <div className="rd-amenity-grid">
                        {items.map((item) => (
                          <span className="rd-amenity-item" key={item}>
                            <FaCheck /> {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}

                  {room.childPolicy && (
                    <div className="rd-policy-block">
                      <h4>Child Policies</h4>
                      <p>{room.childPolicy}</p>
                    </div>
                  )}

                  {room.cribsExtraBeds && (
                    <div className="rd-policy-block">
                      <h4>Cribs and Extra Beds</h4>
                      <p>{room.cribsExtraBeds}</p>
                    </div>
                  )}
                </div>

                <div className="rd-footer">
                  {isOwner ? (
                    <button
                      type="button"
                      className="btn btn-primary rc-manage-btn"
                      onClick={() => onManage?.(room)}
                    >
                      Manage
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary rd-select-btn"
                      onClick={handleReserveClick}
                    >
                      Next
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
