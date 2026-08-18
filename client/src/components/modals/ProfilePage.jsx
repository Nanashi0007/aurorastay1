import { useState } from "react";
import { FaTimes, FaUser } from "react-icons/fa";
import { authFetch } from "../../utils/api";
import "../../styles/Profile.css";

export default function ProfileModal({ user, onClose, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user.firstName || "");
  const [lastName, setLastName] = useState(user.lastName || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await authFetch("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });

      if (!result.ok) {
        setError(result.data?.message || "Failed to update profile.");
        return;
      }

      onUpdated?.(result.data.user);
      setEditing(false);
    } catch (err) {
      console.error("Profile update failed:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setFirstName(user.firstName || "");
    setLastName(user.lastName || "");
    setError(null);
    setEditing(false);
  }

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div
        className="profile-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="profile-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <FaTimes />
        </button>

        <div className="profile-modal-avatar-wrap">
          {user.picture ? (
            <img
              src={user.picture}
              alt={`${user.firstName} ${user.lastName}`}
              className="profile-modal-avatar"
            />
          ) : (
            <div className="profile-modal-avatar profile-modal-avatar-fallback">
              <FaUser />
            </div>
          )}
        </div>

        {editing ? (
          <div className="profile-modal-form">
            <div className="profile-modal-field">
              <label htmlFor="pm-firstName">First Name</label>
              <input
                id="pm-firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>

            <div className="profile-modal-field">
              <label htmlFor="pm-lastName">Last Name</label>
              <input
                id="pm-lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            {error && <span className="profile-modal-error">{error}</span>}

            <div className="profile-modal-actions">
              <button
                type="button"
                className="btn-link"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="profile-modal-name">
              {user.firstName} {user.lastName}
            </h2>
            <p className="profile-modal-email">{user.email}</p>
            {user.role && (
              <span className="profile-modal-role-badge">{user.role}</span>
            )}

            <button
              type="button"
              className="btn btn-outline profile-modal-edit-btn"
              onClick={() => setEditing(true)}
            >
              Edit Profile
            </button>
          </>
        )}
      </div>
    </div>
  );
}
