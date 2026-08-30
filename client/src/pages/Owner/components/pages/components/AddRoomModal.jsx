import { useState, useRef } from "react";
import { FaTimes, FaCamera, FaTrash, FaCheck } from "react-icons/fa";
import "../../../../../styles/Hotels/AddRoomModal.css";
import { API_BASE } from "../../../../../config";

const MIN_PHOTOS = 3;
const MAX_PHOTOS = 20;

const AMENITY_CATEGORIES = [
  {
    key: "bathroom",
    label: "Bathroom",
    options: [
      "Private bathroom",
      "Private toilet",
      "Shower",
      "Vanity mirror in bathroom",
      "Towels",
      "Bath towels",
      "Hot water (24 hours)",
      "Slippers",
      "Massage shower head",
      "Bidet sprayer",
    ],
  },
  {
    key: "room_amenities",
    label: "Room Amenities",
    options: [
      "Air conditioning",
      "Heating",
      "Curtains",
      "Blackout curtains",
      "Rug",
      "Bedding: Down duvet",
      "Bedding: Blanket or quilt",
    ],
  },
  {
    key: "media_technology",
    label: "Media and Technology",
    options: [
      "TV",
      "Satellite channels",
      "Smart door lock",
      "Video streaming services",
    ],
  },
  {
    key: "general_amenities",
    label: "General Amenities",
    options: [
      "Turndown service",
      "Clothes hangers",
      "Single-standard power outlet",
      "Multi-standard power outlet",
      "220V power outlet",
      "Private entrance",
      "Desk",
      "Dining area",
    ],
  },
  {
    key: "cleaning_services",
    label: "Cleaning Services",
    options: ["Daily housekeeping"],
  },
  {
    key: "toiletries",
    label: "Toiletries",
    options: [
      "Toothbrushes",
      "Toothpaste",
      "Shampoo",
      "Conditioner",
      "Soap",
      "Comb",
      "Razor",
    ],
  },
  {
    key: "internet",
    label: "Internet and Communications",
    options: ["Wi-Fi in room", "Wired Internet in room"],
  },
  {
    key: "food_drink",
    label: "Food and Drink",
    options: ["Tea bags", "Bottled water", "Electric kettle"],
  },
];

const BED_TYPES = [
  "1 single bed",
  "1 double bed",
  "2 single beds",
  "1 queen bed",
  "1 king bed",
  "2 double beds",
  "1 double bed + 1 single bed",
];

const VIEW_OPTIONS = [
  "City view",
  "Garden view",
  "Sea view",
  "Pool view",
  "Mountain view",
  "No view",
];

export default function AddRoomModal({
  propertyId,
  authToken,
  onClose,
  onSuccess,
}) {
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
    childPolicy: "",
    cribsExtraBeds: "",
  });

  const [amenities, setAmenities] = useState(
    AMENITY_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.key]: [] }), {}),
  );

  const [photos, setPhotos] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  function updateField(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function toggleAmenity(categoryKey, option) {
    setAmenities((prev) => {
      const current = prev[categoryKey] || [];
      const has = current.includes(option);
      return {
        ...prev,
        [categoryKey]: has
          ? current.filter((o) => o !== option)
          : [...current, option],
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

  function validate() {
    const newErrors = {};
    if (!formData.roomName.trim())
      newErrors.roomName = "Room name is required.";
    if (!formData.pricePerNight || Number(formData.pricePerNight) <= 0)
      newErrors.pricePerNight = "Enter a valid price.";
    if (photos.length < MIN_PHOTOS)
      newErrors.photos = `Please add at least ${MIN_PHOTOS} photos.`;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const body = new FormData();
      Object.entries(formData).forEach(([key, value]) =>
        body.append(key, value),
      );
      body.append("amenities", JSON.stringify(amenities));
      photos.forEach((photo) => body.append("photos", photo.file));

      const res = await fetch(`${API_BASE}/api/listings/${propertyId}/rooms`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body,
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to create room.");
        return;
      }

      onSuccess(data.room);
    } catch (err) {
      console.error(err);
      alert("Something went wrong creating this room.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="wizard-overlay" role="dialog" aria-modal="true">
      <div className="wizard-modal add-room-modal">
        <div className="wizard-header">
          <span className="wizard-header-title">Add Room Type</span>
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
          {/* --- Basics --- */}
          <div className="wizard-field">
            <label htmlFor="roomName">Room Name</label>
            <input
              id="roomName"
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
            <label htmlFor="roomDescription">Description</label>
            <textarea
              id="roomDescription"
              rows={3}
              placeholder="Describe this room…"
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
            />
          </div>

          <div className="wizard-row">
            <div className="wizard-field">
              <label htmlFor="pricePerNight">Price per Night (₱)</label>
              <input
                id="pricePerNight"
                type="number"
                min="0"
                value={formData.pricePerNight}
                onChange={(e) => updateField("pricePerNight", e.target.value)}
              />
              {errors.pricePerNight && (
                <span className="field-error">{errors.pricePerNight}</span>
              )}
            </div>
            <div className="wizard-field">
              <label htmlFor="maxGuests">Sleeps (Max Guests)</label>
              <input
                id="maxGuests"
                type="number"
                min="1"
                value={formData.maxGuests}
                onChange={(e) => updateField("maxGuests", e.target.value)}
              />
            </div>
            <div className="wizard-field">
              <label htmlFor="roomsAvailable">Rooms Available</label>
              <input
                id="roomsAvailable"
                type="number"
                min="1"
                value={formData.roomsAvailable}
                onChange={(e) => updateField("roomsAvailable", e.target.value)}
              />
            </div>
          </div>

          {/* --- Room specs (matches your Trip.com reference) --- */}
          <div className="wizard-row">
            <div className="wizard-field">
              <label htmlFor="bedType">Bed Type</label>
              <select
                id="bedType"
                value={formData.bedType}
                onChange={(e) => updateField("bedType", e.target.value)}
              >
                <option value="">Select bed type</option>
                {BED_TYPES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div className="wizard-field">
              <label htmlFor="view">View</label>
              <select
                id="view"
                value={formData.view}
                onChange={(e) => updateField("view", e.target.value)}
              >
                <option value="">Select view</option>
                {VIEW_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="wizard-row">
            <div className="wizard-field">
              <label htmlFor="roomSizeSqm">Room Size (m²)</label>
              <input
                id="roomSizeSqm"
                type="number"
                min="0"
                step="0.1"
                placeholder="31"
                value={formData.roomSizeSqm}
                onChange={(e) => updateField("roomSizeSqm", e.target.value)}
              />
            </div>
            <div className="wizard-field">
              <label htmlFor="floorRange">Floor</label>
              <input
                id="floorRange"
                type="text"
                placeholder="e.g. 2-3, 5-7"
                value={formData.floorRange}
                onChange={(e) => updateField("floorRange", e.target.value)}
              />
            </div>
          </div>

          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={formData.smokingAllowed}
              onChange={(e) => updateField("smokingAllowed", e.target.checked)}
            />
            <span>Smoking allowed in this room</span>
          </label>

          {/* --- Categorized amenities --- */}
          <div className="wizard-field">
            <label>Amenities</label>
            {AMENITY_CATEGORIES.map((category) => (
              <div className="amenity-category" key={category.key}>
                <h4 className="amenity-category-title">{category.label}</h4>
                <div className="amenity-chip-row">
                  {category.options.map((option) => {
                    const active = amenities[category.key]?.includes(option);
                    return (
                      <button
                        type="button"
                        key={option}
                        className={`amenity-chip-sm ${active ? "active" : ""}`}
                        onClick={() => toggleAmenity(category.key, option)}
                      >
                        {active && <FaCheck />}
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* --- Policies --- */}
          <div className="wizard-field">
            <label htmlFor="childPolicy">Child Policy</label>
            <textarea
              id="childPolicy"
              rows={2}
              placeholder="e.g. Children of all ages can stay in this room."
              value={formData.childPolicy}
              onChange={(e) => updateField("childPolicy", e.target.value)}
            />
          </div>

          <div className="wizard-field">
            <label htmlFor="cribsExtraBeds">Cribs and Extra Beds</label>
            <textarea
              id="cribsExtraBeds"
              rows={2}
              placeholder="e.g. Extra beds and cribs are unavailable for this room type."
              value={formData.cribsExtraBeds}
              onChange={(e) => updateField("cribsExtraBeds", e.target.value)}
            />
          </div>

          {/* --- Photos --- */}
          <div className="wizard-field">
            <label>Room Photos</label>
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
                  {idx === 0 && (
                    <span className="photo-cover-badge">Cover</span>
                  )}
                </div>
              ))}

              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  className="photo-upload-box"
                  onClick={() => inputRef.current?.click()}
                >
                  <FaCamera />
                  <span>Add Photo</span>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={handleFilesSelected}
                  />
                </button>
              )}
            </div>
            <small className="photo-count-note">
              {photos.length} / {MAX_PHOTOS} photos — minimum {MIN_PHOTOS}
            </small>
            {errors.photos && (
              <span className="field-error">{errors.photos}</span>
            )}
          </div>
        </div>

        <div className="wizard-footer">
          <button
            type="button"
            className="btn-link"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary wizard-next-btn"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Saving…" : "Save Room"}
          </button>
        </div>
      </div>
    </div>
  );
}
