import { useState, useRef } from "react";
import { FaTimes, FaCamera } from "react-icons/fa";
import "../../../../../styles/Hotels/ReserveForm.css";

const DEPOSIT_RATE = 0.2; // 20% down payment

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function nightsBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  const diff = Math.round((outDate - inDate) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

export default function ReserveModal({
  room,
  gcashQrUrl,
  authToken,
  user,
  onClose,
  onSuccess,
}) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guestsCount, setGuestsCount] = useState(1);
  const [guestName, setGuestName] = useState(
    user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "",
  );
  const [guestContact, setGuestContact] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const fileInputRef = useRef(null);

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const nights = nightsBetween(checkIn, checkOut);
  const totalPrice = nights * Number(room.pricePerNight || 0);
  const depositAmount = Math.round(totalPrice * DEPOSIT_RATE);

  function handleProofSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
    setErrors((prev) => ({ ...prev, proofFile: undefined }));
  }

  function validate() {
    const newErrors = {};
    if (!checkIn) newErrors.checkIn = "Check-in date is required.";
    if (!checkOut) newErrors.checkOut = "Check-out date is required.";
    if (checkIn && checkOut && nights <= 0)
      newErrors.checkOut = "Check-out must be after check-in.";
    if (!guestsCount || guestsCount < 1)
      newErrors.guestsCount = "Enter at least 1 guest.";
    if (!guestName.trim()) newErrors.guestName = "Guest name is required.";
    if (!guestContact.trim())
      newErrors.guestContact = "Contact number is required.";
    if (!proofFile)
      newErrors.proofFile = "Upload your GCash payment screenshot.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("roomId", room.id);
      body.append("checkIn", checkIn);
      body.append("checkOut", checkOut);
      body.append("guestsCount", guestsCount);
      body.append("guestName", guestName.trim());
      body.append("guestContact", guestContact.trim());
      body.append("specialRequests", specialRequests.trim());
      body.append("depositProof", proofFile);

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body,
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ form: data.message || "Failed to submit booking." });
        return;
      }

      setSubmitted(true);
      onSuccess?.(data.booking);
    } catch (err) {
      console.error(err);
      setErrors({ form: "Something went wrong. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="rm-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="rm-card" onClick={(e) => e.stopPropagation()}>
        <h1 style={{ background: "yellow", padding: 8 }}>
          DEBUG gcashQrUrl: {String(gcashQrUrl)}
        </h1>

        <button
          type="button"
          className="rm-close"
          onClick={onClose}
          aria-label="Close"
        >
          <FaTimes />
        </button>
        {/* ...rest stays the same... */}

        {submitted ? (
          <div className="rm-success">
            <h2>Booking Requested</h2>
            <p>
              Your request for <strong>{room.roomName}</strong> has been sent to
              the owner. You'll be notified once it's confirmed.
            </p>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <>
            <h2>Reserve — {room.roomName}</h2>
            <p className="rm-sub">₱{room.pricePerNight} / night</p>

            <form className="rm-form" onSubmit={handleSubmit}>
              <div className="rm-row">
                <div className="rm-field">
                  <label htmlFor="checkIn">Check-in</label>
                  <input
                    id="checkIn"
                    type="date"
                    min={todayISO()}
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                  />
                  {errors.checkIn && (
                    <span className="rm-error">{errors.checkIn}</span>
                  )}
                </div>
                <div className="rm-field">
                  <label htmlFor="checkOut">Check-out</label>
                  <input
                    id="checkOut"
                    type="date"
                    min={checkIn || todayISO()}
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                  />
                  {errors.checkOut && (
                    <span className="rm-error">{errors.checkOut}</span>
                  )}
                </div>
              </div>

              <div className="rm-field">
                <label htmlFor="guestsCount">Guests</label>
                <input
                  id="guestsCount"
                  type="number"
                  min="1"
                  max={room.maxGuests || undefined}
                  value={guestsCount}
                  onChange={(e) => setGuestsCount(Number(e.target.value))}
                />
                {errors.guestsCount && (
                  <span className="rm-error">{errors.guestsCount}</span>
                )}
              </div>

              <div className="rm-field">
                <label htmlFor="guestName">Guest Name</label>
                <input
                  id="guestName"
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                />
                {errors.guestName && (
                  <span className="rm-error">{errors.guestName}</span>
                )}
              </div>

              <div className="rm-field">
                <label htmlFor="guestContact">Contact Number</label>
                <input
                  id="guestContact"
                  type="tel"
                  placeholder="09XX XXX XXXX"
                  value={guestContact}
                  onChange={(e) => setGuestContact(e.target.value)}
                />
                {errors.guestContact && (
                  <span className="rm-error">{errors.guestContact}</span>
                )}
              </div>

              <div className="rm-field">
                <label htmlFor="specialRequests">
                  Special Requests (optional)
                </label>
                <textarea
                  id="specialRequests"
                  rows={2}
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                />
              </div>

              {nights > 0 && (
                <div className="rm-summary">
                  <div className="rm-summary-row">
                    <span>
                      ₱{room.pricePerNight} × {nights} night
                      {nights > 1 ? "s" : ""}
                    </span>
                    <span>₱{totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="rm-summary-row rm-summary-deposit">
                    <strong>Down payment due now (20%)</strong>
                    <strong>₱{depositAmount.toLocaleString()}</strong>
                  </div>
                </div>
              )}

              <div className="rm-field">
                <label>GCash Payment</label>
                <small className="rm-hint">
                  Send ₱
                  {depositAmount > 0
                    ? depositAmount.toLocaleString()
                    : "the deposit"}{" "}
                  via GCash using the QR code below, then upload your payment
                  screenshot.
                </small>

                {gcashQrUrl ? (
                  <img
                    src={gcashQrUrl}
                    alt="GCash QR Code"
                    className="rm-qr-image"
                  />
                ) : (
                  <p className="rm-error">
                    This property hasn't set up GCash payments yet.
                  </p>
                )}

                {!proofFile ? (
                  <button
                    type="button"
                    className="rm-upload-box"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!gcashQrUrl}
                  >
                    <FaCamera />
                    <span>Upload payment screenshot</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleProofSelect}
                    />
                  </button>
                ) : (
                  <div className="rm-proof-preview">
                    <img src={proofPreview} alt="Payment proof" />
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => {
                        setProofFile(null);
                        setProofPreview(null);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
                {errors.proofFile && (
                  <span className="rm-error">{errors.proofFile}</span>
                )}
              </div>

              {errors.form && <span className="rm-error">{errors.form}</span>}

              <button
                type="submit"
                className="btn btn-primary rm-submit"
                disabled={submitting || !gcashQrUrl}
              >
                {submitting ? "Submitting…" : "Request to Book"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
