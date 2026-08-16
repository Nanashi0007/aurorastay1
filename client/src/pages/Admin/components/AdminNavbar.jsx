import { FaBars } from "react-icons/fa";

export default function AdminNavbar({ currentAdmin, onMenuClick }) {
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
        <div className="admin-navbar-user">
          {currentAdmin.picture ? (
            <img
              src={currentAdmin.picture}
              alt={currentAdmin.firstName}
              className="admin-navbar-avatar"
            />
          ) : (
            <div className="admin-navbar-avatar-fallback">
              {currentAdmin.firstName?.[0]}
              {currentAdmin.lastName?.[0]}
            </div>
          )}
          <div className="admin-navbar-user-text">
            <div className="admin-navbar-user-name">
              {currentAdmin.firstName} {currentAdmin.lastName}
            </div>
            <div className="admin-navbar-user-email">{currentAdmin.email}</div>
          </div>
        </div>
      )}
    </header>
  );
}
