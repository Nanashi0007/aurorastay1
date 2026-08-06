import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import "../../styles/LoginModal.css";

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("http://localhost:5000/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: credentialResponse.credential,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed. Please try again.");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Let the parent decide what happens next -- if this is a first-time
      // sign-up, it'll show the "confirm your name" step.
      onLoginSuccess?.(data.user, data.isNewUser, data.token);
      onClose();
    } catch (err) {
      console.error("Google login request failed:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google sign-in was cancelled or failed. Please try again.");
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="lm-backdrop" onClick={handleBackdropClick}>
      <div
        className="lm-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lm-title"
      >
        <button className="lm-close" onClick={onClose} aria-label="Close">
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
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap
            theme="outline"
            size="large"
            width="320"
            text="continue_with"
          />
        </div>

        {submitting && <p className="lm-status">Signing you in...</p>}
        {error && <p className="lm-error">{error}</p>}
      </div>
    </div>
  );
}
