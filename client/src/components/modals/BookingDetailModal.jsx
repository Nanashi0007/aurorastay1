import { useState } from "react";
import {
  FaTimes,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaHotel,
  FaBed,
  FaHome,
  FaUser,
  FaPhone,
} from "react-icons/fa";
import "../../styles/BookingDetailModal.css";

const TYPE_ICONS = {
  Hotel: FaHotel,
  Inn: FaBed,
  Homestay: FaHome,
};

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

export default function BookingDetailModal({
  booking,
  authToken,
  onClose,
  onStatusUpdated,
}) {
  const [updating, setUpdating] = useState(false);
  const [actionError, setActionError] = useState(null);

  if (!booking) return null;

  const nights = nightsBetween(booking.checkIn, booking.checkOut);
  const TypeIcon = booking.accommodationType
    ? TYPE_ICONS[booking.accommodationType]
    : null;

  async function handleStatusChange(status) {
    setUpdating(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();

      if (!res.ok) {
        setActionError(data.message || "Failed to update booking.");
        return;
      }

      onStatusUpdated?.(booking.id, status);
      onClose();
    } catch (err) {
      console.error(err);
      setActionError("Something went wrong. Please try again.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div
      className="bd-overlay"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="bd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bd-topbar">
          <span
            className={`mb-status mb-status-${booking.status}`}
            style={{ marginRight: "auto" }}
          >
            {STATUS_LABELS[booking.status] || booking.status}
          </span>
          <button
            type="button"
            className="bd-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        <div className="bd-photo">
          {booking.coverPhotoUrl ? (
            <img src={booking.coverPhotoUrl} alt={booking.listingTitle} />
          ) : (
            <div className="bd-photo-placeholder">No photo</div>
          )}
          {booking.accommodationType && (
            <span className="mb-card-type-badge">
              {TypeIcon && <TypeIcon />}
              {booking.accommodationType}
            </span>
          )}
        </div>

        <div className="bd-body">
          <h3 className="bd-room-title">{booking.roomName}</h3>
          <p className="bd-listing-title">{booking.listingTitle}</p>
          {booking.location && (
            <p className="bd-location">
              <FaMapMarkerAlt /> {booking.location}
            </p>
          )}

          <div className="bd-section">
            <h4>Stay Details</h4>
            <p>
              <FaCalendarAlt />{" "}
              {formatDateRange(booking.checkIn, booking.checkOut)}
              {nights > 0 && (
                <span className="mb-nights">
                  {" "}
                  · {nights} night{nights > 1 ? "s" : ""}
                </span>
              )}
            </p>
            <p>
              {booking.guestsCount} guest{booking.guestsCount > 1 ? "s" : ""}
            </p>
          </div>

          <div className="bd-section">
            <h4>Guest Information</h4>
            <p>
              <FaUser /> {booking.guestName}
            </p>
            {booking.guestContact && (
              <p>
                <FaPhone /> {booking.guestContact}
              </p>
            )}
            {booking.specialRequests && (
              <p className="bd-special-requests">
                <strong>Special requests:</strong> {booking.specialRequests}
              </p>
            )}
          </div>

          <div className="bd-section">
            <h4>Payment</h4>
            <div className="bd-price-row">
              <span>
                ₱{Number(booking.pricePerNight).toLocaleString()} × {nights}{" "}
                night
                {nights > 1 ? "s" : ""}
              </span>
              <span>₱{Number(booking.totalPrice).toLocaleString()}</span>
            </div>
            <div className="bd-price-row bd-price-deposit">
              <strong>Deposit paid</strong>
              <strong>₱{Number(booking.depositAmount).toLocaleString()}</strong>
            </div>
            {booking.paymentStatus && (
              <p className="bd-payment-status">
                Payment status: {booking.paymentStatus}
              </p>
            )}
            {booking.depositProofUrl && (
              <div className="bd-proof">
                <small>Payment proof</small>

                <a
                  href={booking.depositProofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={booking.depositProofUrl}
                    alt="Payment proof"
                    className="bd-proof-image"
                  />
                </a>
              </div>
            )}
          </div>

          {actionError && <p className="rf-error">{actionError}</p>}
        </div>

        {booking.status === "pending" && (
          <div className="bd-footer">
            <button
              type="button"
              className="btn-link"
              disabled={updating}
              onClick={() => handleStatusChange("declined")}
            >
              Decline
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={updating}
              onClick={() => handleStatusChange("confirmed")}
            >
              {updating ? "Updating…" : "Confirm Booking"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
