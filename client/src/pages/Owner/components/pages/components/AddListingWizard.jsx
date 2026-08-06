import { useState, useRef } from "react";
import {
  FaTimes,
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
  FaHotel,
  FaHome,
  FaBed,
  FaWarehouse,
  FaMapMarkerAlt,
  FaCamera,
  FaFileUpload,
  FaTrash,
  FaWifi,
  FaSwimmingPool,
  FaParking,
  FaSnowflake,
  FaUtensils,
  FaTv,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaFileSignature,
  FaShieldAlt,
} from "react-icons/fa";
import "../../../../../styles/Owner/AddListingWizard.css";

import LocationMapPicker from "./LocationMapPicker";

const STEPS = [
  { id: "type", label: "Property Type" },
  { id: "details", label: "Details" },
  { id: "location", label: "Location" },
  { id: "photos", label: "Photos" },
  { id: "amenities", label: "Amenities" },
  { id: "contact", label: "Contact Info" },
  { id: "payment", label: "Payment Info" }, // new
  { id: "agreement", label: "Agreement" },
];

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

const MIN_PHOTOS = 3;
const MAX_PHOTOS = 100;

/* ---------- Step 1: Property Type ---------- */
function PropertyTypeStep({ formData, updateField }) {
  return (
    <div className="wizard-step">
      <h2>What kind of property are you listing?</h2>
      <p className="wizard-step-sub">
        Pick the option that best describes your place.
      </p>

      <div className="property-type-grid">
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
  );
}

/* ---------- Step 2: Property Details ---------- */
function PropertyDetailsStep({ formData, updateField, errors }) {
  return (
    <div className="wizard-step">
      <h2>What's the name of your property?</h2>
      <p className="wizard-step-sub">
        This is how guests will see your property listed.
      </p>

      <div className="wizard-field">
        <label htmlFor="propertyName">Property Name</label>
        <input
          id="propertyName"
          type="text"
          placeholder="e.g. Baler Surf Lodge"
          value={formData.title}
          onChange={(e) => updateField("title", e.target.value)}
        />
        {errors.title && <span className="field-error">{errors.title}</span>}
      </div>

      <div className="wizard-field">
        <label htmlFor="propertyDescription">Description (optional)</label>
        <textarea
          id="propertyDescription"
          rows={4}
          placeholder="Tell guests what makes your place special…"
          value={formData.description}
          onChange={(e) => updateField("description", e.target.value)}
        />
      </div>
    </div>
  );
}

/* ---------- Step 3: Location (updated) ---------- */
function LocationStep({ formData, updateField, errors }) {
  function handleLocationSelect({ lat, lng, address, municipality, barangay }) {
    updateField("latitude", lat);
    updateField("longitude", lng);
    if (municipality) updateField("municipality", municipality);
    if (barangay) updateField("barangay", barangay);
    if (address) updateField("completeAddress", address);
  }

  return (
    <div className="wizard-step">
      <h2>Where's your property located?</h2>
      <p className="wizard-step-sub">
        Drop a pin on the map, then confirm or edit the details below.
      </p>

      <LocationMapPicker
        onLocationSelect={handleLocationSelect}
        initialPosition={
          formData.latitude && formData.longitude
            ? { lat: formData.latitude, lng: formData.longitude }
            : null
        }
      />

      <div className="wizard-row" style={{ marginTop: 18 }}>
        <div className="wizard-field">
          <label htmlFor="municipality">
            <FaMapMarkerAlt /> Municipality
          </label>
          <select
            id="municipality"
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
          {errors.municipality && (
            <span className="field-error">{errors.municipality}</span>
          )}
        </div>

        <div className="wizard-field">
          <label htmlFor="barangay">Barangay</label>
          <input
            id="barangay"
            type="text"
            placeholder="e.g. Sabang"
            value={formData.barangay}
            onChange={(e) => updateField("barangay", e.target.value)}
          />
          {errors.barangay && (
            <span className="field-error">{errors.barangay}</span>
          )}
        </div>
      </div>

      <div className="wizard-field">
        <label htmlFor="completeAddress">Complete Address</label>
        <input
          id="completeAddress"
          type="text"
          placeholder="Street, landmark"
          value={formData.completeAddress}
          onChange={(e) => updateField("completeAddress", e.target.value)}
        />
        {errors.completeAddress && (
          <span className="field-error">{errors.completeAddress}</span>
        )}
      </div>

      {!formData.latitude && (
        <div className="map-pin-note">
          <FaMapMarkerAlt />
          <span>
            No pin placed yet — drop one on the map above, or fill in the fields
            manually.
          </span>
        </div>
      )}
    </div>
  );
}

/* ---------- Step 4: Photos ---------- */
function PhotosStep({ photos, setPhotos, errors }) {
  const inputRef = useRef(null);

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

  return (
    <div className="wizard-step">
      <h2>Add photos of your property</h2>
      <p className="wizard-step-sub">
        Upload {MIN_PHOTOS} to {MAX_PHOTOS} photos. Clear, well-lit photos get
        more bookings.
      </p>

      <div className="photo-grid">
        {photos.map((photo, idx) => (
          <div className="photo-thumb" key={idx}>
            <img src={photo.previewUrl} alt={`Property photo ${idx + 1}`} />
            <button
              type="button"
              className="photo-remove-btn"
              onClick={() => removePhoto(idx)}
              aria-label="Remove photo"
            >
              <FaTrash />
            </button>
            {idx === 0 && <span className="photo-cover-badge">Cover</span>}
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
        {photos.length} / {MAX_PHOTOS} photos added
        {photos.length > 0 && " — first photo is used as the cover image"}
      </small>
      {errors.photos && <span className="field-error">{errors.photos}</span>}
    </div>
  );
}

/* ---------- Step 5: Amenities ---------- */
function AmenitiesStep({ formData, toggleAmenity }) {
  return (
    <div className="wizard-step">
      <h2>What amenities do you offer?</h2>
      <p className="wizard-step-sub">Select all that apply.</p>

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
  );
}

/* ---------- Step 6: Room Type ---------- */

/* ---------- Step 7: Contact Info ---------- */
function ContactInfoStep({ formData, updateField, errors }) {
  return (
    <div className="wizard-step">
      <h2>Contact Information</h2>
      <p className="wizard-step-sub">
        How guests and AuroraStay can reach you about this property.
      </p>

      <div className="wizard-row">
        <div className="wizard-field">
          <label htmlFor="contactEmail">
            <FaEnvelope /> Email
          </label>
          <input
            id="contactEmail"
            type="email"
            placeholder="you@example.com"
            value={formData.contactEmail}
            onChange={(e) => updateField("contactEmail", e.target.value)}
          />
          {errors.contactEmail && (
            <span className="field-error">{errors.contactEmail}</span>
          )}
        </div>

        <div className="wizard-field">
          <label htmlFor="contactPhone">
            <FaPhone /> Phone Number
          </label>
          <input
            id="contactPhone"
            type="tel"
            placeholder="09XX XXX XXXX"
            value={formData.contactPhone}
            onChange={(e) => updateField("contactPhone", e.target.value)}
          />
          {errors.contactPhone && (
            <span className="field-error">{errors.contactPhone}</span>
          )}
        </div>
      </div>

      <div className="wizard-row">
        <div className="wizard-field">
          <label htmlFor="signatoryName">
            <FaFileSignature /> Contract Signatory's Name
          </label>
          <input
            id="signatoryName"
            type="text"
            placeholder="Full legal name"
            value={formData.signatoryName}
            onChange={(e) => updateField("signatoryName", e.target.value)}
          />
          {errors.signatoryName && (
            <span className="field-error">{errors.signatoryName}</span>
          )}
        </div>

        <div className="wizard-field">
          <label htmlFor="contractingParty">
            <FaUser /> Contracting Party
          </label>
          <input
            id="contractingParty"
            type="text"
            placeholder="Individual or business name"
            value={formData.contractingParty}
            onChange={(e) => updateField("contractingParty", e.target.value)}
          />
          {errors.contractingParty && (
            <span className="field-error">{errors.contractingParty}</span>
          )}
        </div>
      </div>

      <div className="wizard-field">
        <label>Customer-Property Communications</label>
        <div className="comm-options">
          {["Email", "Phone Call", "SMS"].map((method) => (
            <label className="comm-checkbox" key={method}>
              <input
                type="checkbox"
                checked={formData.commMethods.includes(method)}
                onChange={() => {
                  const has = formData.commMethods.includes(method);
                  updateField(
                    "commMethods",
                    has
                      ? formData.commMethods.filter((m) => m !== method)
                      : [...formData.commMethods, method],
                  );
                }}
              />
              {method}
            </label>
          ))}
        </div>
        <small className="wizard-hint">
          How should guests reach you with questions about this property?
        </small>
      </div>
    </div>
  );
}

/* ---------- Step 7: Payment Info ---------- */
function PaymentInfoStep({
  gcashQrFile,
  gcashQrPreview,
  onQrSelected,
  onQrRemoved,
  wiseDetails,
  updateField,
  errors,
}) {
  const inputRef = useRef(null);

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    onQrSelected(file);
    e.target.value = "";
  }

  return (
    <div className="wizard-step">
      <h2>How will guests pay you?</h2>
      <p className="wizard-step-sub">
        Add at least one payment method so guests can send their reservation
        deposit. You can update these anytime later.
      </p>

      <div className="wizard-field">
        <label>GCash QR Code</label>
        <small className="wizard-hint">
          For local guests paying via GCash.
        </small>

        {!gcashQrFile ? (
          <button
            type="button"
            className="photo-upload-box"
            style={{ width: 160, height: 160 }}
            onClick={() => inputRef.current?.click()}
          >
            <FaCamera />
            <span>Upload QR Code</span>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleFileSelect}
            />
          </button>
        ) : (
          <div className="photo-thumb" style={{ width: 160, height: 160 }}>
            <img src={gcashQrPreview} alt="GCash QR preview" />
            <button
              type="button"
              className="photo-remove-btn"
              onClick={onQrRemoved}
              aria-label="Remove QR code"
            >
              <FaTrash />
            </button>
          </div>
        )}
      </div>

      <div className="wizard-field">
        <label htmlFor="wiseDetails">
          Wise / International Bank Transfer Details
        </label>
        <small className="wizard-hint">
          For foreign guests. Include your Wise account name, account number, or
          a payment link.
        </small>
        <textarea
          id="wiseDetails"
          rows={3}
          placeholder="e.g. Wise account name: Juan Dela Cruz, Account: XXXXXXXXX, or link: wise.com/pay/..."
          value={wiseDetails}
          onChange={(e) => updateField("wiseDetails", e.target.value)}
        />
      </div>

      {errors.payment && <span className="field-error">{errors.payment}</span>}
    </div>
  );
}

/* ---------- Step 8: Agreement ---------- */
function AgreementStep({ formData, updateField, errors }) {
  return (
    <div className="wizard-step">
      <h2>Agreement</h2>
      <p className="wizard-step-sub">
        Last step — review and confirm before submitting.
      </p>

      <div className="agreement-box">
        <FaShieldAlt />
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={formData.agreed}
            onChange={(e) => updateField("agreed", e.target.checked)}
          />
          <span>
            By clicking the button below, I certify I have read and agree to all
            linked documents herein. Additionally, I certify I have read and
            agree to the Electronic Record and Signature Disclosure.
          </span>
        </label>
      </div>
      {errors.agreed && <span className="field-error">{errors.agreed}</span>}
    </div>
  );
}

/* ---------- Main Wizard ---------- */
export default function AddListingWizard({ authToken, onClose, onSuccess }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [gcashQrFile, setGcashQrFile] = useState(null);
  const [gcashQrPreview, setGcashQrPreview] = useState(null);

  const [formData, setFormData] = useState({
    accommodationType: "",
    title: "",
    description: "",
    municipality: "",
    barangay: "",
    completeAddress: "",
    amenities: [],
    contactEmail: "",
    contactPhone: "",
    signatoryName: "",
    contractingParty: "",
    commMethods: [],
    wiseDetails: "", // new
    agreed: false,
  });

  function updateField(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function toggleAmenity(value) {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(value)
        ? prev.amenities.filter((a) => a !== value)
        : [...prev.amenities, value],
    }));
  }

  function handleQrSelected(file) {
    setGcashQrFile(file);
    setGcashQrPreview(URL.createObjectURL(file));
    setErrors((prev) => ({ ...prev, payment: undefined }));
  }

  function handleQrRemoved() {
    if (gcashQrPreview) URL.revokeObjectURL(gcashQrPreview);
    setGcashQrFile(null);
    setGcashQrPreview(null);
  }

  function validateStep(index) {
    const newErrors = {};
    const step = STEPS[index].id;

    if (step === "type" && !formData.accommodationType) {
      newErrors.accommodationType = "Please select a property type.";
    }

    if (step === "payment") {
      if (!gcashQrFile && !formData.wiseDetails.trim()) {
        newErrors.payment =
          "Add at least one payment method (GCash QR or Wise details).";
      }
    }

    if (step === "details" && !formData.title.trim()) {
      newErrors.title = "Property name is required.";
    }

    if (step === "location") {
      if (!formData.municipality)
        newErrors.municipality = "Select a municipality.";
      if (!formData.barangay.trim())
        newErrors.barangay = "Barangay is required.";
      if (!formData.completeAddress.trim())
        newErrors.completeAddress = "Complete address is required.";
    }

    if (step === "photos" && photos.length < MIN_PHOTOS) {
      newErrors.photos = `Please add at least ${MIN_PHOTOS} photos.`;
    }

    if (step === "contact") {
      if (!formData.contactEmail.trim()) {
        newErrors.contactEmail = "Email is required.";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
        newErrors.contactEmail = "Enter a valid email.";
      }
      if (!formData.contactPhone.trim())
        newErrors.contactPhone = "Phone number is required.";
      if (!formData.signatoryName.trim())
        newErrors.signatoryName = "Signatory name is required.";
      if (!formData.contractingParty.trim())
        newErrors.contractingParty = "Contracting party is required.";
    }

    if (step === "agreement" && !formData.agreed) {
      newErrors.agreed = "You must agree before submitting.";
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
        if (Array.isArray(value)) {
          body.append(key, JSON.stringify(value));
        } else {
          body.append(key, value);
        }
      });
      photos.forEach((photo) => body.append("photos", photo.file));
      if (gcashQrFile) {
        body.append("qrCode", gcashQrFile);
      }

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body,
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to create listing.");
        return;
      }

      onSuccess();
    } catch (err) {
      console.error(err);
      alert("Something went wrong submitting your listing.");
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
          <span className="wizard-header-title">Add Room / Accommodation</span>
          <button
            type="button"
            className="wizard-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        {/* Progress bar */}
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
                  className={`wizard-progress-line ${
                    idx < stepIndex ? "completed" : ""
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="wizard-progress-label">
          Step {stepIndex + 1} of {STEPS.length}: {STEPS[stepIndex].label}
        </div>

        {/* Step content */}
        <div className="wizard-body">
          {currentStepId === "type" && (
            <PropertyTypeStep formData={formData} updateField={updateField} />
          )}
          {currentStepId === "details" && (
            <PropertyDetailsStep
              formData={formData}
              updateField={updateField}
              errors={errors}
            />
          )}
          {currentStepId === "location" && (
            <LocationStep
              formData={formData}
              updateField={updateField}
              errors={errors}
            />
          )}
          {currentStepId === "photos" && (
            <PhotosStep photos={photos} setPhotos={setPhotos} errors={errors} />
          )}
          {currentStepId === "amenities" && (
            <AmenitiesStep formData={formData} toggleAmenity={toggleAmenity} />
          )}

          {currentStepId === "contact" && (
            <ContactInfoStep
              formData={formData}
              updateField={updateField}
              errors={errors}
            />
          )}
          {currentStepId === "payment" && (
            <PaymentInfoStep
              gcashQrFile={gcashQrFile}
              gcashQrPreview={gcashQrPreview}
              onQrSelected={handleQrSelected}
              onQrRemoved={handleQrRemoved}
              wiseDetails={formData.wiseDetails}
              updateField={updateField}
              errors={errors}
            />
          )}
          {currentStepId === "agreement" && (
            <AgreementStep
              formData={formData}
              updateField={updateField}
              errors={errors}
            />
          )}
        </div>

        {/* Footer navigation */}
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
              "Submit Listing"
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
