import { useState } from "react";
import "../../styles/ProfileModal.css";
import { API_BASE } from "../../config";

export default function CompleteProfileModal({
  isOpen,
  token,
  initialFirstName,
  initialLastName,
  onComplete,
}) {
  const [firstName, setFirstName] = useState(initialFirstName || "");
  const [lastName, setLastName] = useState(initialLastName || "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      setError("Please fill in both fields.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/api/users/me`, {
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

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Something went wrong. Please try again.");
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      onComplete?.(data.user);
    } catch (err) {
      console.error("Profile update request failed:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cp-backdrop">
      <div
        className="cp-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cp-title"
      >
        <div className="cp-head">
          <div className="cp-logo">AuroraStay</div>
          <h1 id="cp-title">Welcome! Let's confirm your name</h1>
          <p className="cp-subtitle">
            We pulled this from your Google account — feel free to edit it.
          </p>
        </div>

        <form className="cp-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="First name"
            aria-label="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />

          <input
            type="text"
            placeholder="Last name"
            aria-label="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />

          {error && <p className="cp-error">{error}</p>}

          <button type="submit" className="cp-submit" disabled={submitting}>
            {submitting ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
