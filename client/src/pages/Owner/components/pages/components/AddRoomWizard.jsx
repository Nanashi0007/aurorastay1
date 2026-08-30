import { useState } from "react";
import {
  FaTimes,
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
  FaCamera,
  FaTrash,
} from "react-icons/fa";
import { API_BASE } from "../../../../../config";

const STEPS = [
  { id: "basics", label: "Basics" },
  { id: "specs", label: "Room Specs" },
  { id: "amenities", label: "Amenities" },
  { id: "policies", label: "Policies" },
  { id: "photos", label: "Photos" },
  { id: "review", label: "Review" },
];

const AMENITY_GROUPS = {
  bathroom: ["Private bathroom", "Shower", "Hot water (24 hours)", "Bathtub"],
  room_amenities: ["Air conditioning", "Heating", "Curtains", "Balcony"],
  media_technology: ["TV", "Satellite channels", "Streaming service"],
  general_amenities: [
    "Turndown service",
    "Multi-standard power outlet",
    "Safe",
  ],
  cleaning_services: ["Daily housekeeping"],
  toiletries: ["Shampoo", "Soap", "Bottled water"],
  internet: ["Wi-Fi in room", "Wired Internet in room"],
};

const GROUP_LABELS = {
  bathroom: "Bathroom",
  room_amenities: "Room Amenities",
  media_technology: "Media & Technology",
  general_amenities: "General",
  cleaning_services: "Cleaning Services",
  toiletries: "Toiletries",
  internet: "Internet",
};

const MAX_PHOTOS = 5;

export default function AddRoomWizard({
  propertyId,
  authToken,
  onClose,
  onSuccess,
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState([]);

  const [formData, setFormData] = useState({
    roomName: "",
    description: "",
    pricePerNight: "",
    maxGuests: 2,
    roomsAvailable: 1,
    bedType: "",
    roomSizeSqm: "",
    floorRange: "",
    view: "",
    smokingAllowed: false,
    amenities: {},
    childPolicy: "",
    cribsExtraBeds: "",
  });

  function updateField(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function toggleAmenity(group, item) {
    setFormData((prev) => {
      const current = prev.amenities[group] || [];
      const updated = current.includes(item)
        ? current.filter((i) => i !== item)
        : [...current, item];
      return {
        ...prev,
        amenities: { ...prev.amenities, [group]: updated },
      };
    });
  }

  function handleFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const remainingSlots = MAX_PHOTOS - photos.length;
    const accepted = files.slice(0, remainingSlots);
    const withPreviews = accepted.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...withPreviews]);
    e.target.value = "";
  }

  function removePhoto(index) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  function validateStep(index) {
    const newErrors = {};
    const step = STEPS[index].id;

    if (step === "basics") {
      if (!formData.roomName.trim())
        newErrors.roomName = "Room name is required.";
      if (!formData.pricePerNight || Number(formData.pricePerNight) <= 0)
        newErrors.pricePerNight = "Enter a valid price.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function goNext() {
    if (!validateStep(stepIndex)) return;
    if (stepIndex === STEPS.length - 1) {
      handleSubmit();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const body = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === "amenities") {
          body.append(key, JSON.stringify(value));
        } else {
          body.append(key, value);
        }
      });
      photos.forEach((photo) => body.append("photos", photo.file));

      const res = await fetch(`${API_BASE}/api/listings/${propertyId}/rooms`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body,
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to add room.");
        return;
      }

      onSuccess(data.room);
    } catch (err) {
      console.error(err);
      alert("Something went wrong adding this room.");
    } finally {
      setSubmitting(false);
    }
  }

  const currentStepId = STEPS[stepIndex].id;
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === STEPS.length - 1;

  return (
    <div className="wizard-overlay" role="dialog" aria-modal="true">
      <div className="wizard-modal">
        <div className="wizard-header">
          <span className="wizard-header-title">Add Room</span>
          <button
            type="button"
            className="wizard-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        <div className="wizard-progress">
          {STEPS.map((step, idx) => (
            <div className="wizard-progress-step" key={step.id}>
              <div
                className={`wizard-progress-dot ${
                  idx < stepIndex
                    ? "completed"
                    : idx === stepIndex
                      ? "current"
                      : ""
                }`}
              >
                {idx < stepIndex ? <FaCheck /> : idx + 1}
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`wizard-progress-line ${idx < stepIndex ? "completed" : ""}`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="wizard-progress-label">
          Step {stepIndex + 1} of {STEPS.length}: {STEPS[stepIndex].label}
        </div>

        <div className="wizard-body">
          {currentStepId === "basics" && (
            <div className="wizard-step">
              <h2>Room Basics</h2>
              <div className="wizard-field">
                <label>Room Name</label>
                <input
                  type="text"
                  placeholder="e.g. Executive Room"
                  value={formData.roomName}
                  onChange={(e) => updateField("roomName", e.target.value)}
                />
                {errors.roomName && (
                  <span className="field-error">{errors.roomName}</span>
                )}
              </div>
              <div className="wizard-field">
                <label>Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                />
              </div>
              <div className="wizard-row">
                <div className="wizard-field">
                  <label>Price per Night (₱)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.pricePerNight}
                    onChange={(e) =>
                      updateField("pricePerNight", e.target.value)
                    }
                  />
                  {errors.pricePerNight && (
                    <span className="field-error">{errors.pricePerNight}</span>
                  )}
                </div>
                <div className="wizard-field">
                  <label>Max Guests</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxGuests}
                    onChange={(e) => updateField("maxGuests", e.target.value)}
                  />
                </div>
                <div className="wizard-field">
                  <label>Rooms Available</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.roomsAvailable}
                    onChange={(e) =>
                      updateField("roomsAvailable", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {currentStepId === "specs" && (
            <div className="wizard-step">
              <h2>Room Specs</h2>
              <div className="wizard-row">
                <div className="wizard-field">
                  <label>Bed Type</label>
                  <input
                    type="text"
                    placeholder="e.g. 1 double bed"
                    value={formData.bedType}
                    onChange={(e) => updateField("bedType", e.target.value)}
                  />
                </div>
                <div className="wizard-field">
                  <label>Room Size (sqm)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.roomSizeSqm}
                    onChange={(e) => updateField("roomSizeSqm", e.target.value)}
                  />
                </div>
              </div>
              <div className="wizard-row">
                <div className="wizard-field">
                  <label>Floor Range</label>
                  <input
                    type="text"
                    placeholder="e.g. 2-3, 5-7"
                    value={formData.floorRange}
                    onChange={(e) => updateField("floorRange", e.target.value)}
                  />
                </div>
                <div className="wizard-field">
                  <label>View</label>
                  <input
                    type="text"
                    placeholder="e.g. City view"
                    value={formData.view}
                    onChange={(e) => updateField("view", e.target.value)}
                  />
                </div>
              </div>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={formData.smokingAllowed}
                  onChange={(e) =>
                    updateField("smokingAllowed", e.target.checked)
                  }
                />
                <span>Smoking allowed</span>
              </label>
            </div>
          )}

          {currentStepId === "amenities" && (
            <div className="wizard-step">
              <h2>Amenities</h2>
              {Object.entries(AMENITY_GROUPS).map(([group, items]) => (
                <div key={group} className="wizard-field">
                  <label>{GROUP_LABELS[group]}</label>
                  <div className="amenities-grid">
                    {items.map((item) => {
                      const active = (formData.amenities[group] || []).includes(
                        item,
                      );
                      return (
                        <button
                          type="button"
                          key={item}
                          className={`amenity-chip ${active ? "active" : ""}`}
                          onClick={() => toggleAmenity(group, item)}
                        >
                          <span>{item}</span>
                          {active && <FaCheck className="amenity-check" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {currentStepId === "policies" && (
            <div className="wizard-step">
              <h2>Policies</h2>
              <div className="wizard-field">
                <label>Child Policy</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Children of all ages can stay in this room."
                  value={formData.childPolicy}
                  onChange={(e) => updateField("childPolicy", e.target.value)}
                />
              </div>
              <div className="wizard-field">
                <label>Cribs & Extra Beds</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Extra beds and cribs are unavailable for this room type."
                  value={formData.cribsExtraBeds}
                  onChange={(e) =>
                    updateField("cribsExtraBeds", e.target.value)
                  }
                />
              </div>
            </div>
          )}

          {currentStepId === "photos" && (
            <div className="wizard-step">
              <h2>Room Photos</h2>
              <div className="photo-grid">
                {photos.map((photo, idx) => (
                  <div className="photo-thumb" key={idx}>
                    <img src={photo.previewUrl} alt={`Room photo ${idx + 1}`} />
                    <button
                      type="button"
                      className="photo-remove-btn"
                      onClick={() => removePhoto(idx)}
                      aria-label="Remove photo"
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <label className="photo-upload-box">
                    <FaCamera />
                    <span>Add Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      onChange={handleFilesSelected}
                    />
                  </label>
                )}
              </div>
              <small className="photo-count-note">
                {photos.length} / {MAX_PHOTOS} photos added
              </small>
            </div>
          )}

          {currentStepId === "review" && (
            <div className="wizard-step">
              <h2>Review</h2>
              <p className="wizard-step-sub">
                Confirm everything looks right before submitting.
              </p>

              <div className="review-block">
                <h4>{formData.roomName || "Untitled Room"}</h4>
                <p>{formData.description || "No description provided."}</p>
                <p>
                  ₱{formData.pricePerNight || 0} / night · Up to{" "}
                  {formData.maxGuests} guests · {formData.roomsAvailable}{" "}
                  room(s) available
                </p>
              </div>

              <div className="review-block">
                <h4>Specs</h4>
                <p>
                  {formData.bedType || "—"} ·{" "}
                  {formData.roomSizeSqm ? `${formData.roomSizeSqm} sqm` : "—"} ·{" "}
                  Floor {formData.floorRange || "—"} · {formData.view || "—"} ·{" "}
                  {formData.smokingAllowed ? "Smoking allowed" : "No smoking"}
                </p>
              </div>

              <div className="review-block">
                <h4>Amenities</h4>
                {Object.entries(formData.amenities).every(
                  ([, v]) => v.length === 0,
                ) ? (
                  <p>None selected.</p>
                ) : (
                  Object.entries(formData.amenities).map(([group, items]) =>
                    items.length > 0 ? (
                      <p key={group}>
                        <strong>{GROUP_LABELS[group]}:</strong>{" "}
                        {items.join(", ")}
                      </p>
                    ) : null,
                  )
                )}
              </div>

              <div className="review-block">
                <h4>Photos</h4>
                <p>{photos.length} photo(s) attached.</p>
              </div>
            </div>
          )}
        </div>

        <div className="wizard-footer">
          <button
            type="button"
            className="btn-link wizard-back-btn"
            onClick={goBack}
            disabled={isFirstStep || submitting}
          >
            <FaChevronLeft /> Back
          </button>
          <button
            type="button"
            className="btn btn-primary wizard-next-btn"
            onClick={goNext}
            disabled={submitting}
          >
            {submitting ? (
              "Submitting…"
            ) : isLastStep ? (
              "Add Room"
            ) : (
              <>
                Next <FaChevronRight />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
