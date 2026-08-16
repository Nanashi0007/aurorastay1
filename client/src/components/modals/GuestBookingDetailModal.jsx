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
  pending: "Awaiting Confirmation",
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

export default function GuestBookingDetailModal({
  booking,
  authToken,
  onClose,
  onCancelled,
}) {
  const [cancelling, setCancelling] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [actionError, setActionError] = useState(null);

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [localReview, setLocalReview] = useState(booking.review || null);

  const isPastCheckout = parseDateOnly(booking.checkOut) < new Date();
  const canReview =
    booking.status === "confirmed" && isPastCheckout && !localReview;

  async function handleSubmitReview() {
    if (!reviewRating) {
      setReviewError("Please select a rating.");
      return;
    }
    setSubmittingReview(true);
    setReviewError(null);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReviewError(data.message || "Failed to submit review.");
        return;
      }
      setLocalReview(data.review);
    } catch (err) {
      console.error(err);
      setReviewError("Something went wrong. Please try again.");
    } finally {
      setSubmittingReview(false);
    }
  }

  if (!booking) return null;

  const nights = nightsBetween(booking.checkIn, booking.checkOut);
  const TypeIcon = booking.accommodationType
    ? TYPE_ICONS[booking.accommodationType]
    : null;

  const canCancel =
    ["pending", "confirmed"].includes(booking.status) && !isPastCheckout;
  const isConfirmed = booking.status === "confirmed";

  async function handleCancel() {
    setCancelling(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();

      if (!res.ok) {
        setActionError(data.message || "Failed to cancel booking.");
        return;
      }

      onCancelled?.(booking.id);
      onClose();
    } catch (err) {
      console.error(err);
      setActionError("Something went wrong. Please try again.");
    } finally {
      setCancelling(false);
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

          {booking.specialRequests && (
            <div className="bd-section">
              <h4>Special Requests</h4>
              <p className="bd-special-requests">{booking.specialRequests}</p>
            </div>
          )}

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
          </div>

          {(canReview || localReview) && (
            <div className="bd-section">
              <h4>Your Review</h4>

              {localReview ? (
                <div className="bd-review-display">
                  <div
                    style={{ fontSize: 16, color: "#f59e0b", marginBottom: 4 }}
                  >
                    {"★".repeat(localReview.rating)}
                    {"☆".repeat(5 - localReview.rating)}
                  </div>
                  {localReview.comment && (
                    <p style={{ fontSize: 13.5, color: "#374151", margin: 0 }}>
                      {localReview.comment}
                    </p>
                  )}
                </div>
              ) : (
                <div className="bd-review-form">
                  <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: 22,
                          color: star <= reviewRating ? "#f59e0b" : "#d1d5db",
                          padding: 0,
                        }}
                        aria-label={`${star} star`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="How was your stay? (optional)"
                    rows={3}
                    style={{
                      width: "100%",
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      padding: 8,
                      fontSize: 13.5,
                      resize: "vertical",
                      boxSizing: "border-box",
                    }}
                  />
                  {reviewError && <p className="rf-error">{reviewError}</p>}
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={submittingReview}
                    onClick={handleSubmitReview}
                    style={{ marginTop: 8 }}
                  >
                    {submittingReview ? "Submitting…" : "Submit Review"}
                  </button>
                </div>
              )}
            </div>
          )}

          {actionError && <p className="rf-error">{actionError}</p>}
        </div>

        {canCancel && (
          <div className="bd-footer">
            {confirmingCancel ? (
              <>
                <span className="bd-cancel-confirm-text">
                  {isConfirmed
                    ? "This booking is already confirmed. Your deposit may not be refunded — cancel anyway?"
                    : "Cancel this booking?"}
                </span>
                <button
                  type="button"
                  className="btn-link"
                  disabled={cancelling}
                  onClick={() => setConfirmingCancel(false)}
                >
                  Keep booking
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={cancelling}
                  onClick={handleCancel}
                >
                  {cancelling ? "Cancelling…" : "Yes, cancel"}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn-link bd-cancel-btn"
                onClick={() => setConfirmingCancel(true)}
              >
                Cancel Booking
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
