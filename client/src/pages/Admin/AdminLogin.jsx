import { useState, useRef, useEffect } from "react";
import "../../styles/Admin/admin-login.css";
import { GoogleLogin } from "@react-oauth/google";
import { persistAuth } from "../../utils/storage";
import { persistAdminAuth } from "../../utils/storage";
import Navbar from "../Home/components/Navbar";

export default function AdminLogin({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showLogin, setShowLogin] = useState(false);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  const [authLoading, setAuthLoading] = useState(true);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed.");
        return;
      }

      persistAdminAuth(data.token, data.user);

      onLoginSuccess?.();
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

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

  // Restore the logged-in state on page load / refresh.
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      try {
        setAuthToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    setAuthLoading(false);
  }, []);

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setAuthToken(null);
    setShowUserMenu(false);
  };

  return (
    <>
      <Navbar
        user={user}
        authLoading={authLoading}
        showUserMenu={showUserMenu}
        setShowUserMenu={setShowUserMenu}
        userMenuRef={userMenuRef}
        onLoginClick={() => setShowLogin(true)}
        onLogout={handleLogout}
      />
      <div className="admin-login-page">
        <form className="admin-login-form" onSubmit={handleSubmit}>
          <h1>Admin Login</h1>

          <div className="admin-login-field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="admin-login-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && <p className="admin-login-error">{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Logging in…" : "Log In"}
          </button>

          <center>
            <h5>Or</h5>
          </center>

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
        </form>
      </div>
    </>
  );
}
