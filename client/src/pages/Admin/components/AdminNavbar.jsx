import { useState } from "react";
import { FaBars } from "react-icons/fa";
import AdminProfileModal from "./AdminProfileModal";

export default function AdminNavbar({ currentAdmin, onMenuClick }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const isGoogleAdmin = !!currentAdmin?.email;
  const displayName = isGoogleAdmin
    ? currentAdmin.firstName
    : currentAdmin?.username;

  return (
    <header className="admin-navbar">
      <div className="admin-navbar-brand">
        <button
          type="button"
          className="admin-navbar-menu-btn"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <FaBars />
        </button>

        <span>
          <span className="admin-navbar-brand-mark">Aurora</span>Stay
          <span className="admin-navbar-badge">Admin</span>
        </span>
      </div>

      {currentAdmin && (
        <button
          type="button"
          className="admin-navbar-user admin-navbar-user-btn"
          onClick={() => setProfileOpen(true)}
        >
          {currentAdmin.picture ? (
            <img
              src={currentAdmin.picture}
              alt={displayName}
              className="admin-navbar-avatar"
            />
          ) : (
            <div className="admin-navbar-avatar-fallback">
              {isGoogleAdmin
                ? `${currentAdmin.firstName?.[0] || ""}${currentAdmin.lastName?.[0] || ""}`
                : currentAdmin?.username?.[0]?.toUpperCase()}
            </div>
          )}
          <span className="admin-navbar-user-name-inline">{displayName}</span>
        </button>
      )}

      <AdminProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        currentAdmin={currentAdmin}
      />
    </header>
  );
}
