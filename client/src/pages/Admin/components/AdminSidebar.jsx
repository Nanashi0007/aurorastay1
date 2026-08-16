import {
  FaUsers,
  FaSignOutAlt,
  FaFileAlt,
  FaBullhorn,
  FaDatabase,
  FaTimes,
} from "react-icons/fa";

export default function AdminSidebar({
  currentAdmin,
  onLogout,
  activeView,
  onNavigate,
  isOpen,
  onClose,
}) {
  return (
    <>
      <div
        className={`admin-sidebar-backdrop ${isOpen ? "open" : ""}`}
        onClick={onClose}
      />

      <aside className={`admin-sidebar ${isOpen ? "open" : ""}`}>
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-title">Admin Panel</div>
          <button
            type="button"
            className="admin-sidebar-close-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            <FaTimes />
          </button>
        </div>

        <nav className="admin-sidebar-nav">
          <button
            type="button"
            className={`admin-sidebar-nav-item ${activeView === "users" ? "is-active" : ""}`}
            onClick={() => {
              onNavigate("users");
              onClose?.();
            }}
          >
            <FaUsers /> Users
          </button>
          <button
            type="button"
            className={`admin-sidebar-nav-item ${activeView === "applications" ? "is-active" : ""}`}
            onClick={() => {
              onNavigate("applications");
              onClose?.();
            }}
          >
            <FaFileAlt /> Applications
          </button>

          <button
            type="button"
            className={`admin-sidebar-nav-item ${activeView === "announcements" ? "is-active" : ""}`}
            onClick={() => {
              onNavigate("announcements");
              onClose?.();
            }}
          >
            <FaBullhorn /> Announcements
          </button>
        </nav>

        <div className="admin-sidebar-danger-zone">
          <div className="admin-sidebar-danger-label">Danger zone</div>
          <button
            type="button"
            className={`admin-sidebar-nav-item admin-sidebar-nav-item-danger ${activeView === "BackupAndRestore" ? "is-active" : ""}`}
            onClick={() => {
              onNavigate("BackupAndRestore");
              onClose?.();
            }}
          >
            <FaDatabase /> Backup &amp; restore
          </button>
        </div>

        <div className="admin-sidebar-footer">
          {currentAdmin?.username && (
            <div className="admin-sidebar-user">
              Logged in as <strong>{currentAdmin.username}</strong>
            </div>
          )}
          <button
            type="button"
            className="admin-sidebar-logout"
            onClick={onLogout}
          >
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}
