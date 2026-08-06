import { useState, useRef } from "react";
import {
  FaTimes,
  FaCamera,
  FaTrash,
  FaHotel,
  FaHome,
  FaBed,
  FaWarehouse,
  FaMapMarkerAlt,
  FaWifi,
  FaSwimmingPool,
  FaParking,
  FaSnowflake,
  FaUtensils,
  FaTv,
  FaCheck,
  FaEnvelope,
  FaPhone,
} from "react-icons/fa";
import LocationMapPicker from "./LocationMapPicker";

const MAX_PHOTOS = 5;

const PROPERTY_TYPES = [
  { value: "Hotel", icon: FaHotel },
  { value: "Resort", icon: FaWarehouse },
  { value: "Inn", icon: FaBed },
  { value: "Homestay", icon: FaHome },
];

const MUNICIPALITIES = [
  "Baler",
  "Casiguran",
  "Dilasag",
  "Dinalungan",
  "Dingalan",
  "Dipaculao",
  "Maria Aurora",
  "San Luis",
];

const AMENITIES_LIST = [
  { value: "WiFi", icon: FaWifi },
  { value: "Swimming Pool", icon: FaSwimmingPool },
  { value: "Free Parking", icon: FaParking },
  { value: "Air Conditioning", icon: FaSnowflake },
  { value: "Breakfast Included", icon: FaUtensils },
  { value: "TV", icon: FaTv },
];

export default function EditListingModal({
  listing,
  authToken,
  onClose,
  onSaved,
}) {
  const [formData, setFormData] = useState({
    accommodationType: listing.accommodationType,
    title: listing.title,
    description: listing.description || "",
    municipality: listing.municipality,
    barangay: listing.barangay,
    completeAddress: listing.completeAddress,
    latitude: listing.latitude || null,
    longitude: listing.longitude || null,
    amenities: listing.amenities || [],
    roomType: listing.roomType,
    pricePerNight: listing.pricePerNight,
    maxGuests: listing.maxGuests,
    roomsAvailable: listing.roomsAvailable,
    contactEmail: listing.contactEmail,
    contactPhone: listing.contactPhone,
    status: listing.status,
  });

  const [existingPhotos, setExistingPhotos] = useState(listing.photos || []);
  const [newPhotos, setNewPhotos] = useState([]);
  const inputRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function updateField(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function toggleAmenity(value) {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(value)
        ? prev.amenities.filter((a) => a !== value)
        : [...prev.amenities, value],
    }));
  }

  function handleLocationSelect({ lat, lng, address, municipality, barangay }) {
    updateField("latitude", lat);
    updateField("longitude", lng);
    if (municipality) updateField("municipality", municipality);
    if (barangay) updateField("barangay", barangay);
    if (address) updateField("completeAddress", address);
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

  async function handleSave() {
    if (totalPhotoCount() < 1) {
      setError("A listing needs at least one photo.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const body = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          body.append(key, JSON.stringify(value));
        } else if (value !== null && value !== undefined) {
          body.append(key, value);
        }
      });

      body.append(
        "keepPhotoUrls",
        JSON.stringify(existingPhotos.map((p) => p.url)),
      );
      newPhotos.forEach((photo) => body.append("photos", photo.file));

      const res = await fetch(`/api/listings/${listing.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${authToken}` },
        body,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to update listing.");
        return;
      }

      onSaved(data.listing);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="wizard-overlay" role="dialog" aria-modal="true">
      <div className="wizard-modal edit-listing-modal">
        <div className="wizard-header">
          <span className="wizard-header-title">Edit Listing</span>
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
          {/* --- Property type --- */}
          <div className="wizard-field">
            <label>Property Type</label>
            <div className="property-type-grid property-type-grid-compact">
              {PROPERTY_TYPES.map(({ value, icon: Icon }) => (
                <button
                  type="button"
                  key={value}
                  className={`property-type-card ${
                    formData.accommodationType === value ? "active" : ""
                  }`}
                  onClick={() => updateField("accommodationType", value)}
                >
                  <Icon />
                  <span>{value}</span>
                </button>
              ))}
            </div>
          </div>

          {/* --- Basic info --- */}
          <div className="wizard-field">
            <label htmlFor="editTitle">Property Name</label>
            <input
              id="editTitle"
              type="text"
              value={formData.title}
              onChange={(e) => updateField("title", e.target.value)}
            />
          </div>

          <div className="wizard-field">
            <label htmlFor="editDescription">Description</label>
            <textarea
              id="editDescription"
              rows={3}
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
            />
          </div>

          {/* --- Location + map --- */}
          <div className="wizard-field">
            <label>
              <FaMapMarkerAlt /> Location
            </label>
            <LocationMapPicker
              onLocationSelect={handleLocationSelect}
              initialPosition={
                formData.latitude && formData.longitude
                  ? {
                      lat: Number(formData.latitude),
                      lng: Number(formData.longitude),
                    }
                  : null
              }
            />
          </div>

          <div className="wizard-row" style={{ marginTop: 10 }}>
            <div className="wizard-field">
              <label htmlFor="editMunicipality">Municipality</label>
              <select
                id="editMunicipality"
                value={formData.municipality}
                onChange={(e) => updateField("municipality", e.target.value)}
              >
                <option value="">Select municipality</option>
                {MUNICIPALITIES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="wizard-field">
              <label htmlFor="editBarangay">Barangay</label>
              <input
                id="editBarangay"
                type="text"
                value={formData.barangay}
                onChange={(e) => updateField("barangay", e.target.value)}
              />
            </div>
          </div>

          <div className="wizard-field">
            <label htmlFor="editAddress">Complete Address</label>
            <input
              id="editAddress"
              type="text"
              value={formData.completeAddress}
              onChange={(e) => updateField("completeAddress", e.target.value)}
            />
          </div>

          {/* --- Amenities --- */}
          <div className="wizard-field">
            <label>Amenities</label>
            <div className="amenities-grid">
              {AMENITIES_LIST.map(({ value, icon: Icon }) => {
                const active = formData.amenities.includes(value);
                return (
                  <button
                    type="button"
                    key={value}
                    className={`amenity-chip ${active ? "active" : ""}`}
                    onClick={() => toggleAmenity(value)}
                  >
                    <Icon />
                    <span>{value}</span>
                    {active && <FaCheck className="amenity-check" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* --- Room type --- */}
          <div className="wizard-field">
            <label htmlFor="editRoomType">Room Type</label>
            <input
              id="editRoomType"
              type="text"
              value={formData.roomType}
              onChange={(e) => updateField("roomType", e.target.value)}
            />
          </div>

          <div className="wizard-row">
            <div className="wizard-field">
              <label htmlFor="editPrice">Price per Night (₱)</label>
              <input
                id="editPrice"
                type="number"
                min="0"
                value={formData.pricePerNight}
                onChange={(e) => updateField("pricePerNight", e.target.value)}
              />
            </div>
            <div className="wizard-field">
              <label htmlFor="editGuests">Max Guests</label>
              <input
                id="editGuests"
                type="number"
                min="1"
                value={formData.maxGuests}
                onChange={(e) => updateField("maxGuests", e.target.value)}
              />
            </div>
            <div className="wizard-field">
              <label htmlFor="editRooms">Rooms Available</label>
              <input
                id="editRooms"
                type="number"
                min="1"
                value={formData.roomsAvailable}
                onChange={(e) => updateField("roomsAvailable", e.target.value)}
              />
            </div>
          </div>

          {/* --- Contact info --- */}
          <div className="wizard-row">
            <div className="wizard-field">
              <label htmlFor="editEmail">
                <FaEnvelope /> Email
              </label>
              <input
                id="editEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => updateField("contactEmail", e.target.value)}
              />
            </div>
            <div className="wizard-field">
              <label htmlFor="editPhone">
                <FaPhone /> Phone
              </label>
              <input
                id="editPhone"
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => updateField("contactPhone", e.target.value)}
              />
            </div>
          </div>

          <div className="wizard-field">
            <label htmlFor="editStatus">Status</label>
            <select
              id="editStatus"
              value={formData.status}
              onChange={(e) => updateField("status", e.target.value)}
            >
              <option value="active">Active</option>
              <option value="hidden">Hidden</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* --- Photos --- */}
          <div className="wizard-field">
            <label>Photos</label>
            <div className="photo-grid">
              {existingPhotos.map((photo) => (
                <div className="photo-thumb" key={photo.url}>
                  <img src={photo.url} alt="Listing" />
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
          </div>

          {error && <span className="field-error">{error}</span>}
        </div>

        <div className="wizard-footer">
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
  );
}
