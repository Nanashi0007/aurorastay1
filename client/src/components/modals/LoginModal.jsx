import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { persistAuth } from "../../utils/storage";
import "../../styles/LoginModal.css";

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: credentialResponse.credential,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed. Please try again.");
        setSubmitting(false);
        return;
      }

      persistAuth(data.token, data.user);
      onLoginSuccess?.(data.user, data.isNewUser, data.token);

      await new Promise((resolve) => setTimeout(resolve, 400));
      onClose?.();
      window.location.reload();
    } catch (err) {
      console.error("Google login request failed:", err);
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google sign-in was cancelled or failed. Please try again.");
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !submitting) onClose();
  };

  return (
    <div className="lm-backdrop" onClick={handleBackdropClick}>
      <div
        className="lm-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lm-title"
      >
        <button
          type="button"
          className="lm-close"
          onClick={onClose}
          aria-label="Close"
          disabled={submitting}
        >
          &times;
        </button>

        <div className="lm-head">
          <div className="lm-logo">AuroraStay</div>
          <h1 id="lm-title">Log in</h1>
          <p className="lm-subtitle">
            Sign in with Google to continue. New here? We'll set up your account
            automatically.
          </p>
        </div>

        <div className="lm-google-wrap">
          {submitting ? (
            <div className="lm-loading-box">
              <span className="lm-spinner" aria-hidden="true" />
              <span>Signing you in…</span>
            </div>
          ) : (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="outline"
              size="large"
              width="320"
              text="continue_with"
            />
          )}
        </div>

        {error && <p className="lm-error">{error}</p>}
      </div>
    </div>
  );
}
