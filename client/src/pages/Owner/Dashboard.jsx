import { Link, Navigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import {
  FaUser,
  FaPhone,
  FaEnvelope,
  FaHotel,
  FaMapMarkerAlt,
  FaFileUpload,
  FaIdCard,
  FaCheckCircle,
  FaTimes,
  FaFilePdf,
  FaFileImage,
  FaHourglassHalf,
  FaExclamationCircle,
} from "react-icons/fa";

import "../../styles/Owner/Dashboard.css";
import Navbar from "../Home/components/Navbar";
import "../../styles/Navbar.css";
import { API_BASE } from "../../config";

const ACCOMMODATION_TYPES = ["Hotel", "Resort", "Inn", "Homestay"];

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

const OWNERSHIP_PROOF_TYPES = [
  "Business Permit",
  "Tourism Accreditation Certificate",
  "Proof of Ownership",
  "Authorization Letter (if managing on behalf of the owner)",
];

const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_FILE_SIZE_MB = 10;

function FileUploadBox({ label, hint, file, onChange, onRemove, inputId }) {
  const inputRef = useRef(null);

  function handleFileSelect(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!ACCEPTED_FILE_TYPES.includes(selected.type)) {
      alert("Only PDF, JPG, PNG, or WEBP files are accepted.");
      e.target.value = "";
      return;
    }

    if (selected.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      alert(`File must be under ${MAX_FILE_SIZE_MB}MB.`);
      e.target.value = "";
      return;
    }

    onChange(selected);
  }

  return (
    <div className="upload-box">
      <label className="upload-label">{label}</label>
      {hint && <small className="upload-hint">{hint}</small>}

      {!file ? (
        <button
          type="button"
          className="upload-dropzone"
          onClick={() => inputRef.current?.click()}
        >
          <FaFileUpload />
          <span>Click to upload (PDF or image)</span>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={handleFileSelect}
            hidden
          />
        </button>
      ) : (
        <div className="upload-preview">
          {file.type === "application/pdf" ? <FaFilePdf /> : <FaFileImage />}
          <span className="upload-filename">{file.name}</span>
          <button
            type="button"
            className="upload-remove"
            onClick={onRemove}
            aria-label="Remove file"
          >
            <FaTimes />
          </button>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [formData, setFormData] = useState({
    fullName: "",
    contactNumber: "",
    email: "",
    proofType: "",
  });

  const [proofFile, setProofFile] = useState(null);
  const [govIdFront, setGovIdFront] = useState(null);
  const [govIdBack, setGovIdBack] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Application status
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [application, setApplication] = useState(null);

  // Auth / navbar
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const userMenuRef = useRef(null);
  const [authLoading, setAuthLoading] = useState(true);

  const approvalSeen = user
    ? localStorage.getItem(`approvalSeen_${user.id}`) === "true"
    : false;

  // Restore session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedToken) setAuthToken(storedToken);
    setAuthLoading(false);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch existing application status on mount
  useEffect(() => {
    async function fetchStatus() {
      const token = authToken || localStorage.getItem("token");
      if (!token) {
        setCheckingStatus(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/host-applications/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setApplication(data.application); // null, or { status, rejection_reason, ... }
      } catch (err) {
        console.error("Failed to fetch application status:", err);
      } finally {
        setCheckingStatus(false);
      }
    }
    fetchStatus();
  }, [authToken]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setAuthToken(null);
    setShowUserMenu(false);
  };

  function updateField(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const newErrors = {};

    if (!formData.fullName.trim())
      newErrors.fullName = "Full name is required.";
    if (!formData.contactNumber.trim())
      newErrors.contactNumber = "Contact number is required.";
    if (!formData.email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Enter a valid email address.";
    }

    if (!formData.proofType)
      newErrors.proofType = "Select a proof of ownership type.";
    if (!proofFile) newErrors.proofFile = "Upload your proof document.";
    if (!govIdFront) newErrors.govIdFront = "Upload the front of your ID.";
    if (!govIdBack) newErrors.govIdBack = "Upload the back of your ID.";

    if (!agreed)
      newErrors.agreed = "You must certify the information before submitting.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }
  async function handleSubmit(e) {
    e.preventDefault();

    if (!validate()) {
      const firstErrorField = document.querySelector(".field-error");
      firstErrorField?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    try {
      const token = authToken || localStorage.getItem("token");

      const body = new FormData();
      Object.entries(formData).forEach(([key, value]) =>
        body.append(key, value),
      );
      body.append("agreed", agreed);
      body.append("proofFile", proofFile);
      body.append("govIdFront", govIdFront);
      body.append("govIdBack", govIdBack);

      const res = await fetch(`${API_BASE}/api/host-applications`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to submit application.");
        return;
      }

      // Reflect the new pending state immediately
      setApplication({ status: "pending" });
    } catch (err) {
      console.error(err);
      alert("Something went wrong submitting your application.");
    } finally {
      setSubmitting(false);
    }
  }

  const navbarProps = {
    user,
    authLoading,
    showUserMenu,
    setShowUserMenu,
    userMenuRef,
    onLoginClick: () => setShowLogin(true),
    onLogout: handleLogout,
  };

  // Still checking status: avoid a flash of the wrong screen
  if (checkingStatus) {
    return (
      <>
        <Navbar {...navbarProps} />
        <div className="host-form-wrap">
          <div className="status-loading">
            Checking your application status…
          </div>
        </div>
      </>
    );
  }

  // Pending: block the form entirely
  if (application && application.status === "pending") {
    return (
      <>
        <Navbar {...navbarProps} />
        <div className="host-form-wrap">
          <div className="submit-success pending">
            <FaHourglassHalf />
            <h2>Pending Application</h2>
            <p>
              Your accommodation application is currently under review. We'll
              notify you by email once verification is complete.
            </p>
          </div>
        </div>
      </>
    );
  }

  if (application?.status === "approved" && approvalSeen) {
    return <Navigate to="/owner/dashboard" replace />;
  }
  // Approved: also block the form
  if (application && application.status === "approved") {
    return (
      <>
        <Navbar {...navbarProps} />

        <div className="approval-page">
          <div className="approval-card approved">
            <div className="approval-icon">
              <FaCheckCircle />
            </div>

            <h2>Application Approved!</h2>

            <p>
              Congratulations! Your accommodation has been successfully
              verified. You can now create accommodation listings, manage
              reservations, and start welcoming guests.
            </p>

            <Link
              to="/owner/listings"
              className="approved-btn"
              onClick={() => {
                localStorage.setItem(`approvalSeen_${user?.id}`, "true");
              }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </>
    );
  }

  // No application yet, or rejected → show the form
  return (
    <>
      <Navbar {...navbarProps} />

      <div className="host-form-wrap">
        <div className="host-form-header">
          <h1>Host Your Accommodation</h1>
          <p>Fill out the form below to list your property on AuroraStay.</p>
        </div>

        {application && application.status === "rejected" && (
          <div className="rejection-banner">
            <FaExclamationCircle />
            <div>
              <strong>Your previous application was rejected.</strong>
              {application.rejection_reason && (
                <p>{application.rejection_reason}</p>
              )}
              <span>You may correct the details below and resubmit.</span>
            </div>
          </div>
        )}

        <form className="host-form" onSubmit={handleSubmit} noValidate>
          {/* Section 1 */}
          <section className="form-section">
            <h2>1. Owner Information</h2>

            <div className="form-field">
              <label htmlFor="fullName">
                <FaUser /> Full Name
              </label>
              <input
                id="fullName"
                type="text"
                placeholder="Juan Dela Cruz"
                value={formData.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
              />
              {errors.fullName && (
                <span className="field-error">{errors.fullName}</span>
              )}
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="contactNumber">
                  <FaPhone /> Contact Number
                </label>
                <input
                  id="contactNumber"
                  type="tel"
                  placeholder="09XX XXX XXXX"
                  value={formData.contactNumber}
                  onChange={(e) => updateField("contactNumber", e.target.value)}
                />
                {errors.contactNumber && (
                  <span className="field-error">{errors.contactNumber}</span>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="email">
                  <FaEnvelope /> Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                />
                {errors.email && (
                  <span className="field-error">{errors.email}</span>
                )}
              </div>
            </div>
          </section>

          {/* Section 2 */}
          {/* <section className="form-section">
            <h2>2. Accommodation Information</h2>

            <div className="form-field">
              <label htmlFor="accommodationName">
                <FaHotel /> Accommodation Name
              </label>
              <input
                id="accommodationName"
                type="text"
                placeholder="e.g. Baler Surf Lodge"
                value={formData.accommodationName}
                onChange={(e) =>
                  updateField("accommodationName", e.target.value)
                }
              />
              {errors.accommodationName && (
                <span className="field-error">{errors.accommodationName}</span>
              )}
            </div>

            <div className="form-field">
              <label>Accommodation Type</label>
              <div className="radio-pill-group">
                {ACCOMMODATION_TYPES.map((type) => (
                  <label
                    key={type}
                    className={`radio-pill ${
                      formData.accommodationType === type ? "active" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="accommodationType"
                      value={type}
                      checked={formData.accommodationType === type}
                      onChange={(e) =>
                        updateField("accommodationType", e.target.value)
                      }
                    />
                    {type}
                  </label>
                ))}
              </div>
              {errors.accommodationType && (
                <span className="field-error">{errors.accommodationType}</span>
              )}
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="municipality">
                  <FaMapMarkerAlt /> Municipality/City
                </label>
                <select
                  id="municipality"
                  value={formData.municipality}
                  onChange={(e) => updateField("municipality", e.target.value)}
                >
                  <option value="">Select municipality/city</option>
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

              <div className="form-field">
                <label htmlFor="completeAddress">Complete Address</label>
                <input
                  id="completeAddress"
                  type="text"
                  placeholder="Street, Barangay"
                  value={formData.completeAddress}
                  onChange={(e) =>
                    updateField("completeAddress", e.target.value)
                  }
                />
                {errors.completeAddress && (
                  <span className="field-error">{errors.completeAddress}</span>
                )}
              </div>
            </div>
          </section> */}

          {/* Section 3 */}
          <section className="form-section">
            <h2>2. Proof of Ownership or Authorization</h2>

            <div className="form-field">
              <label>Choose one</label>
              <div className="radio-list-group">
                {OWNERSHIP_PROOF_TYPES.map((type) => (
                  <label
                    key={type}
                    className={`radio-list-item ${
                      formData.proofType === type ? "active" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="proofType"
                      value={type}
                      checked={formData.proofType === type}
                      onChange={(e) => updateField("proofType", e.target.value)}
                    />
                    {type}
                  </label>
                ))}
              </div>
              {errors.proofType && (
                <span className="field-error">{errors.proofType}</span>
              )}
            </div>

            <FileUploadBox
              label="Upload document"
              hint="1 PDF or image only"
              file={proofFile}
              onChange={setProofFile}
              onRemove={() => setProofFile(null)}
              inputId="proofFile"
            />
            {errors.proofFile && (
              <span className="field-error">{errors.proofFile}</span>
            )}
          </section>

          {/* Section 4 */}
          <section className="form-section">
            <h2>3. Government ID</h2>

            <div className="form-row">
              <div className="form-field">
                <FileUploadBox
                  label={
                    <>
                      <FaIdCard /> Front of ID
                    </>
                  }
                  hint="Clear photo of the front side"
                  file={govIdFront}
                  onChange={setGovIdFront}
                  onRemove={() => setGovIdFront(null)}
                  inputId="govIdFront"
                />
                {errors.govIdFront && (
                  <span className="field-error">{errors.govIdFront}</span>
                )}
              </div>

              <div className="form-field">
                <FileUploadBox
                  label={
                    <>
                      <FaIdCard /> Back of ID
                    </>
                  }
                  hint="Clear photo of the back side"
                  file={govIdBack}
                  onChange={setGovIdBack}
                  onRemove={() => setGovIdBack(null)}
                  inputId="govIdBack"
                />
                {errors.govIdBack && (
                  <span className="field-error">{errors.govIdBack}</span>
                )}
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="form-section">
            <h2>6. Agreement</h2>

            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => {
                  setAgreed(e.target.checked);
                  setErrors((prev) => ({ ...prev, agreed: undefined }));
                }}
              />
              <span>
                I certify that the information I provided is accurate and that I
                am the owner or authorized representative of this accommodation.
              </span>
            </label>
            {errors.agreed && (
              <span className="field-error">{errors.agreed}</span>
            )}
          </section>

          <button
            type="submit"
            className="btn btn-primary submit-btn"
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "Submit for Verification"}
          </button>
        </form>
      </div>
    </>
  );
}
