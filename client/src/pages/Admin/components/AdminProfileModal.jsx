import { useState, useEffect } from "react";
import "../../../styles/Admin/adminProfileModal.css";

export default function AdminProfileModal({ isOpen, onClose, currentAdmin }) {
  const isGoogleAdmin = !!currentAdmin?.email;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && currentAdmin) {
      setFirstName(currentAdmin.firstName || "");
      setLastName(currentAdmin.lastName || "");
      setError("");
      setSuccess(false);
    }
  }, [isOpen, currentAdmin]);

  if (!isOpen) return null;

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required.");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Update failed.");

      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...stored, ...data.user }));

      setSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget && !saving) onClose();
  }

  return (
    <div className="pm-backdrop" onClick={handleBackdropClick}>
      <div
        className="pm-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pm-title"
      >
        <button
          type="button"
          className="pm-close"
          onClick={onClose}
          aria-label="Close"
          disabled={saving}
        >
          &times;
        </button>

        <div className="pm-head">
          {currentAdmin?.picture ? (
            <img
              src={currentAdmin.picture}
              alt={currentAdmin.firstName}
              className="pm-avatar"
            />
          ) : (
            <div className="pm-avatar-fallback">
              {isGoogleAdmin
                ? `${currentAdmin?.firstName?.[0] || ""}${currentAdmin?.lastName?.[0] || ""}`
                : currentAdmin?.username?.[0]?.toUpperCase()}
            </div>
          )}
          <h1 id="pm-title">Your profile</h1>
        </div>

        {isGoogleAdmin ? (
          <form onSubmit={handleSave} className="pm-form">
            <div className="pm-field">
              <label className="pm-label" htmlFor="pm-firstName">
                First name
              </label>
              <input
                id="pm-firstName"
                className="pm-input"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="pm-field">
              <label className="pm-label" htmlFor="pm-lastName">
                Last name
              </label>
              <input
                id="pm-lastName"
                className="pm-input"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="pm-field">
              <label className="pm-label">Email</label>
              <div className="pm-static-value">{currentAdmin?.email}</div>
              <p className="pm-hint">Managed by your Google account.</p>
            </div>

            {error && <p className="pm-error">{error}</p>}
            {success && <p className="pm-success">Profile updated.</p>}

            <button type="submit" className="pm-save-btn" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </form>
        ) : (
          <div className="pm-form">
            <div className="pm-field">
              <label className="pm-label">Username</label>
              <div className="pm-static-value">{currentAdmin?.username}</div>
            </div>

            <div className="pm-field">
              <label className="pm-label">Role</label>
              <div
                className="pm-static-value"
                style={{ textTransform: "capitalize" }}
              >
                {currentAdmin?.role}
              </div>
            </div>

            <p className="pm-hint">
              This is a built-in admin account. Name and email aren't available
              for this login type.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
