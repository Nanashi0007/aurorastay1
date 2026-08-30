import { useState, useRef } from "react";
import {
  FaTimes,
  FaCamera,
  FaTrash,
  FaCheck,
  FaTrashAlt,
} from "react-icons/fa";
import ConfirmModal from "./ConfirmModal"; // adjust path to wherever you placed it
import SuccessModal from "./SuccessModal";
import "../../../../../styles/Hotels/EditRoomModal.css";
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

export default function EditRoomModal({
  propertyId,
  room,
  authToken,
  onClose,
  onSaved,
  onDeleted,
}) {
  const [formData, setFormData] = useState({
    roomName: room.roomName || "",
    description: room.description || "",
    pricePerNight: room.pricePerNight || "",
    maxGuests: room.maxGuests || 1,
    roomsAvailable: room.roomsAvailable || 1,
    bedType: room.bedType || "",
    roomSizeSqm: room.roomSizeSqm || "",
    floorRange: room.floorRange || "",
    view: room.view || "",
    smokingAllowed: room.smokingAllowed || false,
    childPolicy: room.childPolicy || "",
    cribsExtraBeds: room.cribsExtraBeds || "",
    status: room.status || "active",
  });

  const [amenities, setAmenities] = useState(() => {
    const base = AMENITY_CATEGORIES.reduce(
      (acc, cat) => ({ ...acc, [cat.key]: [] }),
      {},
    );
    return { ...base, ...(room.amenities || {}) };
  });

  const [existingPhotos, setExistingPhotos] = useState(room.photos || []);
  const [newPhotos, setNewPhotos] = useState([]);
  const inputRef = useRef(null);

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

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

  function totalPhotoCount() {
    return existingPhotos.length + newPhotos.length;
  }

  function handleFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const remainingSlots = MAX_PHOTOS - totalPhotoCount();
    const accepted = files.slice(0, remainingSlots);
    const withPreviews = accepted.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setNewPhotos((prev) => [...prev, ...withPreviews]);
    e.target.value = "";
  }

  function removeExistingPhoto(url) {
    setExistingPhotos((prev) => prev.filter((p) => p.url !== url));
  }

  function removeNewPhoto(index) {
    setNewPhotos((prev) => {
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
    if (totalPhotoCount() < MIN_PHOTOS)
      newErrors.photos = `Please keep at least ${MIN_PHOTOS} photos.`;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;

    setSaving(true);
    const startedAt = Date.now();

    try {
      const body = new FormData();
      Object.entries(formData).forEach(([key, value]) =>
        body.append(key, value),
      );
      body.append("amenities", JSON.stringify(amenities));
      body.append(
        "keepPhotoUrls",
        JSON.stringify(existingPhotos.map((p) => p.url)),
      );
      newPhotos.forEach((photo) => body.append("photos", photo.file));

      const res = await fetch(
        `${API_BASE}/api/listings/${propertyId}/rooms/${room.id}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${authToken}` },
          body,
        },
      );

      const data = await res.json();

      if (!res.ok) {
        setErrors({ form: data.message || "Failed to update room." });
        return;
      }

      // Ensure "Saving…" is visible for at least 500ms
      const elapsed = Date.now() - startedAt;
      if (elapsed < 500) {
        await new Promise((resolve) => setTimeout(resolve, 500 - elapsed));
      }

      setSuccessMessage({
        title: "Room Updated",
        message: "Your changes have been saved.",
      });
      onSaved(data.room);
    } catch (err) {
      console.error(err);
      setErrors({ form: "Something went wrong. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/listings/${propertyId}/rooms/${room.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );
      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to delete room.");
        return;
      }

      setShowDeleteConfirm(false);
      onDeleted(room.id);
    } catch (err) {
      console.error(err);
      alert("Something went wrong deleting this room.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="wizard-overlay" role="dialog" aria-modal="true">
        <div className="wizard-modal add-room-modal">
          <div className="wizard-header">
            <span className="wizard-header-title">
              Manage Room — {room.roomName}
            </span>
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
            <div className="wizard-field">
              <label htmlFor="roomName">Room Name</label>
              <input
                id="roomName"
                type="text"
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
                  onChange={(e) =>
                    updateField("roomsAvailable", e.target.value)
                  }
                />
              </div>
            </div>

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
                  value={formData.roomSizeSqm}
                  onChange={(e) => updateField("roomSizeSqm", e.target.value)}
                />
              </div>
              <div className="wizard-field">
                <label htmlFor="floorRange">Floor</label>
                <input
                  id="floorRange"
                  type="text"
                  value={formData.floorRange}
                  onChange={(e) => updateField("floorRange", e.target.value)}
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
              <span>Smoking allowed in this room</span>
            </label>

            <div className="wizard-field">
              <label htmlFor="roomStatus">Status</label>
              <select
                id="roomStatus"
                value={formData.status}
                onChange={(e) => updateField("status", e.target.value)}
              >
                <option value="active">Active</option>
                <option value="hidden">Hidden</option>
                <option value="archived">Archived</option>
              </select>
            </div>

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

            <div className="wizard-field">
              <label htmlFor="childPolicy">Child Policy</label>
              <textarea
                id="childPolicy"
                rows={2}
                value={formData.childPolicy}
                onChange={(e) => updateField("childPolicy", e.target.value)}
              />
            </div>

            <div className="wizard-field">
              <label htmlFor="cribsExtraBeds">Cribs and Extra Beds</label>
              <textarea
                id="cribsExtraBeds"
                rows={2}
                value={formData.cribsExtraBeds}
                onChange={(e) => updateField("cribsExtraBeds", e.target.value)}
              />
            </div>

            <div className="wizard-field">
              <label>Room Photos</label>
              <div className="photo-grid">
                {existingPhotos.map((photo) => (
                  <div className="photo-thumb" key={photo.url}>
                    <img src={photo.url} alt="Room" />
                    <button
                      type="button"
                      className="photo-remove-btn"
                      onClick={() => removeExistingPhoto(photo.url)}
                      aria-label="Remove photo"
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}

                {newPhotos.map((photo, idx) => (
                  <div className="photo-thumb" key={`new-${idx}`}>
                    <img src={photo.previewUrl} alt="New upload" />
                    <button
                      type="button"
                      className="photo-remove-btn"
                      onClick={() => removeNewPhoto(idx)}
                      aria-label="Remove photo"
                    >
                      <FaTrash />
                    </button>
                    <span className="photo-cover-badge">New</span>
                  </div>
                ))}

                {totalPhotoCount() < MAX_PHOTOS && (
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
                {totalPhotoCount()} / {MAX_PHOTOS} photos
              </small>
              {errors.photos && (
                <span className="field-error">{errors.photos}</span>
              )}
            </div>

            {errors.form && <span className="field-error">{errors.form}</span>}
          </div>

          <div className="wizard-footer edit-room-footer">
            <button
              type="button"
              className="listing-action-btn listing-action-danger"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={saving}
            >
              <FaTrashAlt /> Delete Room
            </button>

            <div className="edit-room-footer-right">
              <button
                type="button"
                className="btn-link"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary wizard-next-btn"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete this room?"
          message={`"${room.roomName}" will be permanently removed, along with all its photos. This can't be undone.`}
          confirmLabel="Delete"
          danger
          loading={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {successMessage && (
        <SuccessModal
          title={successMessage.title}
          message={successMessage.message}
          onClose={() => {
            setSuccessMessage(null);
            onClose();
          }}
        />
      )}
    </>
  );
}
