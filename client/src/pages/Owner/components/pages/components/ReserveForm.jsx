import { useState, useRef } from "react";
import { FaCamera } from "react-icons/fa";

const DEPOSIT_RATE = 0.2;

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function nightsBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const diff = Math.round(
    (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24),
  );
  return diff > 0 ? diff : 0;
}

export default function ReserveForm({
  room,
  gcashQrUrl,
  wiseDetails,
  authToken,
  user,
  onSuccess,
  onCancel,
  onRequireLogin,
}) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guestsCount, setGuestsCount] = useState(1);
  const [guestName, setGuestName] = useState(
    user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "",
  );
  const [guestContact, setGuestContact] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(
    gcashQrUrl ? "gcash" : wiseDetails ? "wise" : "",
  );
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const fileInputRef = useRef(null);

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const nights = nightsBetween(checkIn, checkOut);
  const totalPrice = nights * Number(room.pricePerNight || 0);
  const depositAmount = Math.round(totalPrice * DEPOSIT_RATE);

  const hasGcash = !!gcashQrUrl;
  const hasWise = !!(wiseDetails && wiseDetails.trim());

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
    if (!paymentMethod) newErrors.paymentMethod = "Select a payment method.";
    if (!proofFile)
      newErrors.proofFile =
        "Upload your payment screenshot or proof of transfer.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!authToken) {
      onRequireLogin?.();
      setErrors({ form: "Please log in to reserve this room." });
      return;
    }
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
      body.append("paymentMethod", paymentMethod);
      body.append("depositProof", proofFile);

      const res = await fetch(`${API_BASE}/api/bookings`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body,
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ form: data.message || "Failed to submit booking." });
        return;
      }

      onSuccess?.(data.booking);
    } catch (err) {
      console.error(err);
      setErrors({ form: "Something went wrong. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="rf-form" onSubmit={handleSubmit}>
      <div className="rf-row">
        <div className="rf-field">
          <label htmlFor="checkIn">Check-in</label>
          <input
            id="checkIn"
            type="date"
            min={todayISO()}
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
          />
          {errors.checkIn && <span className="rf-error">{errors.checkIn}</span>}
        </div>
        <div className="rf-field">
          <label htmlFor="checkOut">Check-out</label>
          <input
            id="checkOut"
            type="date"
            min={checkIn || todayISO()}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
          />
          {errors.checkOut && (
            <span className="rf-error">{errors.checkOut}</span>
          )}
        </div>
      </div>

      <div className="rf-field">
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
          <span className="rf-error">{errors.guestsCount}</span>
        )}
      </div>

      <div className="rf-field">
        <label htmlFor="guestName">Guest Name</label>
        <input
          id="guestName"
          type="text"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
        />
        {errors.guestName && (
          <span className="rf-error">{errors.guestName}</span>
        )}
      </div>

      <div className="rf-field">
        <label htmlFor="guestContact">Contact Number</label>
        <input
          id="guestContact"
          type="tel"
          placeholder="09XX XXX XXXX"
          value={guestContact}
          onChange={(e) => setGuestContact(e.target.value)}
        />
        {errors.guestContact && (
          <span className="rf-error">{errors.guestContact}</span>
        )}
      </div>

      <div className="rf-field">
        <label htmlFor="specialRequests">Special Requests (optional)</label>
        <textarea
          id="specialRequests"
          rows={2}
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
        />
      </div>

      {nights > 0 && (
        <div className="rf-summary">
          <div className="rf-summary-row">
            <span>
              ₱{room.pricePerNight} × {nights} night{nights > 1 ? "s" : ""}
            </span>
            <span>₱{totalPrice.toLocaleString()}</span>
          </div>
          <div className="rf-summary-row rf-summary-deposit">
            <strong>Down payment due now (20%)</strong>
            <strong>₱{depositAmount.toLocaleString()}</strong>
          </div>
        </div>
      )}

      <div className="rf-field">
        <label>Payment Method</label>
        <div className="rf-payment-tabs">
          {hasGcash && (
            <button
              type="button"
              className={`rf-payment-tab ${paymentMethod === "gcash" ? "active" : ""}`}
              onClick={() => {
                setPaymentMethod("gcash");
                setErrors((prev) => ({ ...prev, paymentMethod: undefined }));
              }}
            >
              GCash
            </button>
          )}
          {hasWise && (
            <button
              type="button"
              className={`rf-payment-tab ${paymentMethod === "wise" ? "active" : ""}`}
              onClick={() => {
                setPaymentMethod("wise");
                setErrors((prev) => ({ ...prev, paymentMethod: undefined }));
              }}
            >
              International Bank Transfer / Wise
            </button>
          )}
        </div>
        {!hasGcash && !hasWise && (
          <p className="rf-error">
            This property hasn't set up any payment methods yet.
          </p>
        )}
        {errors.paymentMethod && (
          <span className="rf-error">{errors.paymentMethod}</span>
        )}
      </div>

      {paymentMethod === "gcash" && (
        <div className="rf-field">
          <small className="rf-hint">
            Send ₱
            {depositAmount > 0 ? depositAmount.toLocaleString() : "the deposit"}{" "}
            via GCash using the QR code below, then upload your screenshot.
          </small>
          <img src={gcashQrUrl} alt="GCash QR Code" className="rf-qr-image" />
        </div>
      )}

      {paymentMethod === "wise" && (
        <div className="rf-field">
          <small className="rf-hint">
            Send ₱
            {depositAmount > 0 ? depositAmount.toLocaleString() : "the deposit"}{" "}
            via Wise or international bank transfer using the details below,
            then upload your proof of transfer.
          </small>
          <div className="rf-wise-details">{wiseDetails}</div>
        </div>
      )}

      {paymentMethod && (
        <div className="rf-field">
          <label>Payment Proof</label>
          {!proofFile ? (
            <button
              type="button"
              className="rf-upload-box"
              onClick={() => fileInputRef.current?.click()}
            >
              <FaCamera />
              <span>Upload screenshot</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleProofSelect}
              />
            </button>
          ) : (
            <div className="rf-proof-preview">
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
            <span className="rf-error">{errors.proofFile}</span>
          )}
        </div>
      )}

      {errors.form && <span className="rf-error">{errors.form}</span>}

      <div className="rf-actions">
        <button
          type="button"
          className="btn-link"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary rf-submit"
          disabled={submitting || (!hasGcash && !hasWise)}
        >
          {submitting ? "Submitting…" : "Reserve"}
        </button>
      </div>
    </form>
  );
}
