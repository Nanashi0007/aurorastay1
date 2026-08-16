import { Link } from "react-router-dom";
import NotificationBell from "./NotificationBell";
import { QRCodeCanvas } from "qrcode.react";
import { FaQrcode, FaDownload } from "react-icons/fa";
import { useState, useRef } from "react";
import "../../../styles/NavBarQr.css";

import {
  FaChevronDown,
  FaSignOutAlt,
  FaSuitcaseRolling,
  FaHotel,
} from "react-icons/fa";

export default function Navbar({
  user,
  showUserMenu,
  setShowUserMenu,
  userMenuRef,
  showMobileNav,
  setShowMobileNav,
  onLoginClick,
  onLogout,
  authLoading = false,
}) {
  const [showQrModal, setShowQrModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const qrCanvasWrapperRef = useRef(null);

  const browseUrl = `${window.location.origin}/hotels`;

  function handleDownloadQr() {
    const canvas = qrCanvasWrapperRef.current?.querySelector("canvas");

    if (!canvas) return;

    const url = canvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.href = url;
    link.download = "aurorastay-qr-code.png";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleLogoutClick() {
    if (loggingOut) return;

    setLoggingOut(true);
    setShowUserMenu(false);

    const startTime = Date.now();

    try {
      await onLogout();

      // Make sure the loading state is visible for at least 700ms
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(700 - elapsed, 0);

      await new Promise((resolve) => setTimeout(resolve, remaining));

      // Force the application to return to the home page
      window.location.replace("/");
    } catch (error) {
      console.error("Logout failed:", error);
      setLoggingOut(false);
    }
  }

  return (
    <header className="navbar">
      <div className="container nav-container">
        <Link to="/" className="logo">
          <span>Aurora</span>Stay
        </Link>

        {/* Navigation Buttons */}
        <div className="nav-buttons">
          <NotificationBell />

          {authLoading ? (
            <div className="nav-auth-skeleton" aria-hidden="true" />
          ) : user ? (
            <div className="nav-user" ref={userMenuRef}>
              {/* User Button */}
              <button
                type="button"
                className="nav-user-trigger"
                onClick={() => setShowUserMenu((prev) => !prev)}
              >
                {user.picture ? (
                  <img
                    className="nav-user-avatar"
                    src={user.picture}
                    alt={`${user.firstName} ${user.lastName}`}
                  />
                ) : (
                  <div className="nav-user-avatar nav-user-avatar-fallback">
                    {user.firstName?.[0]}
                    {user.lastName?.[0]}
                  </div>
                )}

                <span className="nav-user-name">
                  {user.firstName} {user.lastName}
                </span>

                <FaChevronDown className="nav-user-caret" />
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="nav-user-dropdown">
                  <Link to="/owner-dashboard">
                    <FaHotel />
                    Host Your Property
                  </Link>

                  <Link to="/bookings">
                    <FaSuitcaseRolling />
                    My Bookings
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setShowQrModal(true);
                      setShowUserMenu(false);
                    }}
                  >
                    <FaQrcode />
                    Generate QR Code
                  </button>

                  <div className="nav-user-dropdown-divider" />

                  <button
                    type="button"
                    onClick={handleLogoutClick}
                    disabled={loggingOut}
                  >
                    {loggingOut ? (
                      <span className="nav-btn-spinner" aria-hidden="true" />
                    ) : (
                      <FaSignOutAlt />
                    )}

                    {loggingOut ? "Logging out…" : "Log out"}
                  </button>
                </div>
              )}

              {/* QR Code Modal */}
              {showQrModal && (
                <div
                  className="qr-modal-overlay"
                  onClick={() => setShowQrModal(false)}
                >
                  <div
                    className="qr-modal"
                    onClick={(e) => e.stopPropagation()}
                    style={{ maxWidth: 340 }}
                  >
                    {/* Modal Header */}
                    <div className="qr-modal-header">
                      <div>
                        <h2>AuroraStay QR Code</h2>
                        <p>Scan to browse all stays.</p>
                      </div>

                      <button
                        type="button"
                        className="qr-modal-close"
                        onClick={() => setShowQrModal(false)}
                      >
                        ×
                      </button>
                    </div>

                    {/* QR Code */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 14,
                        padding: "20px 0",
                      }}
                    >
                      <div className="qr-code-wrapper" ref={qrCanvasWrapperRef}>
                        <QRCodeCanvas
                          value={browseUrl}
                          size={220}
                          level="H"
                          includeMargin
                        />
                      </div>

                      <span className="qr-hotel-url">/hotels</span>

                      {/* QR Actions */}
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                        }}
                      >
                        {/* Download QR */}
                        <button
                          type="button"
                          onClick={handleDownloadQr}
                          className="qr-view-link"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            border: "none",
                            cursor: "pointer",
                            font: "inherit",
                          }}
                        >
                          <FaDownload size={12} />
                          Download
                        </button>

                        {/* Open Browse Page */}
                        <a
                          href={browseUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="qr-view-link"
                        >
                          Open Browse Page
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-outline"
              onClick={onLoginClick}
            >
              Login
            </button>
          )}
        </div>
      </div>

      <div className="horizon-line" aria-hidden="true" />
    </header>
  );
}
