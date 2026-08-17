import {
  FaUsers,
  FaSignOutAlt,
  FaFileAlt,
  FaBullhorn,
  FaDatabase,
  FaChartBar,
  FaTimes,
  FaFileDownload,
  FaHistory,
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
            className={`admin-sidebar-nav-item ${activeView === "analytics" ? "is-active" : ""}`}
            onClick={() => {
              onNavigate("analytics");
              onClose?.();
            }}
          >
            <FaChartBar /> Dashboard
          </button>

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

          <button
            type="button"
            className={`admin-sidebar-nav-item ${activeView === "activitylogs" ? "is-active" : ""}`}
            onClick={() => {
              onNavigate("activitylogs");
              onClose?.();
            }}
          >
            <FaHistory /> Activity Logs
          </button>
        </nav>

        <div className="admin-sidebar-danger-zone">
          <div className="admin-sidebar-danger-label">Danger zone</div>
          <button
            type="button"
            className={`admin-sidebar-nav-item admin-sidebar-nav-item-danger ${activeView === "backupandrestore" ? "is-active" : ""}`}
            onClick={() => {
              onNavigate("backupandrestore");
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
