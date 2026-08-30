import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authFetch } from "../../utils/api";
import { clearAuth } from "../../utils/storage";
import {
  FaHome,
  FaClipboardList,
  FaEnvelope,
  FaWallet,
  FaCog,
  FaSignOutAlt,
  FaRedo,
  FaCheck,
  FaInbox,
} from "react-icons/fa";
import Navbar from "../../components/layout/Navbar";
import CompleteProfileModal from "../../components/modals/ProfileModal";
import "../../styles/Owner/OwnerListings.css";
import "../../styles/Owner/OwnerNotifications.css";
import "../../styles/NotificationBell.css";
import { API_BASE } from "../../config"; // adjust relative path per file

const NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: FaHome,
    path: "/owner/dashboard",
  },
  {
    id: "listings",
    label: "My Listings",
    icon: FaHome,
    path: "/owner/listings",
  },
  {
    id: "bookings",
    label: "Bookings",
    icon: FaClipboardList,
    path: "/owner/bookings",
  },
  {
    id: "notification",
    label: "Notification",
    icon: FaEnvelope,
    path: "/owner/notification",
  },
  // {
  //   id: "earnings",
  //   label: "Earnings",
  //   icon: FaWallet,
  //   path: "/owner/earnings",
  // },
  // { id: "settings", label: "Settings", icon: FaCog, path: "/owner/settings" },
];

function timeAgo(dateString) {
  const seconds = Math.floor((Date.now() - new Date(dateString)) / 1000);
  const mins = Math.floor(seconds / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "just now";
}

export default function OwnerNotifications() {
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all"); // "all" | "unread"

  // Sidebar account state (kept in sync with the rest of the owner pages)
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Announcement detail modal
  const [viewingAnnouncement, setViewingAnnouncement] = useState(null);
  const [loadingAnnouncement, setLoadingAnnouncement] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const result = await authFetch(`${API_BASE}/api/notifications`);
      if (!result.ok) {
        setError(result.data?.message || "Failed to load notifications.");
        return;
      }
      setNotifications(result.data?.notifications || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Something went wrong loading your notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load notifications and mark everything as read on entry (Gmail reads a
  // thread when it becomes visible).
  useEffect(() => {
    async function load() {
      await authFetch(`${API_BASE}/api/notifications/read-all`, {
        method: "PATCH",
      });
      await fetchNotifications();
    }
    load();
  }, [fetchNotifications]);

  // Restore auth state for the sidebar account panel.
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      try {
        setAuthToken(storedToken);
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        if (!parsedUser.firstName || !parsedUser.lastName) {
          setShowCompleteProfile(true);
        }
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
    navigate("/");
  };

  const handleProfileComplete = (updatedUser) => {
    setUser(updatedUser);
    setShowCompleteProfile(false);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (id) => {
    try {
      await authFetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await authFetch(`${API_BASE}/api/notifications/read-all`, {
        method: "PATCH",
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  const refresh = () => {
    fetchNotifications();
  };

  const handleItemClick = async (n) => {
    if (!n.read) {
      await markAsRead(n.id);
    }

    if (n.relatedAnnouncementId) {
      setViewingAnnouncement({ createdAt: n.createdAt });
      setLoadingAnnouncement(true);
      try {
        const result = await authFetch(
          `/api/announcements/${n.relatedAnnouncementId}`,
        );
        if (result.ok) {
          setViewingAnnouncement(result.data?.announcement);
        } else {
          setViewingAnnouncement({
            title: "Announcement",
            message: n.message,
            createdAt: n.createdAt,
          });
        }
      } catch (err) {
        console.error("Failed to fetch announcement:", err);
        setViewingAnnouncement({
          title: "Announcement",
          message: n.message,
          createdAt: n.createdAt,
        });
      } finally {
        setLoadingAnnouncement(false);
      }
    } else if (n.relatedBookingId) {
      navigate(`/owner/bookings?bookingId=${n.relatedBookingId}`);
    }
  };

  const displayed =
    filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

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

      <div className="owner-layout">
        <aside className="owner-sidebar">
          <nav className="owner-sidebar-nav">
            {NAV_ITEMS.map(({ id, label, icon: Icon, path }) => (
              <button
                type="button"
                key={id}
                className={`owner-sidebar-link ${
                  location.pathname === path ? "active" : ""
                }`}
                onClick={() => navigate(path)}
              >
                <Icon />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          {user && (
            <div className="owner-sidebar-account">
              <div className="owner-sidebar-avatar">
                {user.picture ? (
                  <img src={user.picture} alt="" />
                ) : (
                  <span>{user.firstName?.[0] || "?"}</span>
                )}
              </div>

              <div className="owner-sidebar-account-info">
                <span className="owner-sidebar-account-name">
                  {user.firstName} {user.lastName}
                </span>
                <button
                  type="button"
                  className="owner-sidebar-logout"
                  onClick={handleLogout}
                >
                  <FaSignOutAlt /> Logout
                </button>
              </div>
            </div>
          )}
        </aside>

        <div className="on-page">
          <div className="on-page-header">
            <h1>Notifications</h1>
            <p className="owner-listings-subtitle">
              All notifications sent to your account.
            </p>
          </div>

          {/* --- Toolbar --- */}
          {viewingAnnouncement ? null : (
            <div className="on-toolbar">
              <div className="on-toolbar-left">
                <span className="on-unread-count">
                  Unread
                  <span className="count">{unreadCount}</span>
                  {unreadCount > 0 && (
                    <span className="badge">{unreadCount}</span>
                  )}
                </span>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="on-btn"
                    onClick={markAllAsRead}
                    title="Mark all as read"
                  >
                    <FaCheck />
                    Mark all as read
                  </button>
                )}
              </div>

              <button
                type="button"
                className="on-btn"
                onClick={refresh}
                disabled={loading}
                title="Refresh"
              >
                <FaRedo />
                Refresh
              </button>
            </div>
          )}

          {/* --- Filter tabs --- */}
          {!viewingAnnouncement && (
            <div className="on-filters">
              <button
                type="button"
                className={`on-filter-pill ${filter === "all" ? "active" : ""}`}
                onClick={() => setFilter("all")}
              >
                All
              </button>
              <button
                type="button"
                className={`on-filter-pill ${
                  filter === "unread" ? "active" : ""
                }`}
                onClick={() => setFilter("unread")}
              >
                Unread
                <span className="on-filter-count">{unreadCount}</span>
              </button>
            </div>
          )}

          {/* --- List --- */}
          <div className="on-list">
            {loading && (
              <div className="on-list-loading">Loading notifications…</div>
            )}

            {!loading && error && <div className="on-list-error">{error}</div>}

            {!loading && !error && displayed.length === 0 && (
              <div className="on-empty">
                <FaInbox />
                <h2>
                  {filter === "unread"
                    ? "No unread notifications"
                    : "You have no notifications yet"}
                </h2>
                <p>
                  New notifications about your listings and bookings will show
                  up here.
                </p>
              </div>
            )}

            {!loading &&
              !error &&
              displayed.map((n) => {
                const isClickable = !!(
                  n.relatedBookingId || n.relatedAnnouncementId
                );
                return (
                  <div
                    key={n.id}
                    className={`on-item ${n.read ? "" : "unread"}`}
                    onClick={() => isClickable && handleItemClick(n)}
                    style={{
                      cursor: isClickable ? "pointer" : "default",
                    }}
                  >
                    <span className="on-item-dot" />
                    <div className="on-item-content">
                      <p className="on-item-message">{n.message}</p>
                      <p className="on-item-time">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* --- Announcement detail modal --- */}
      {viewingAnnouncement && (
        <div
          className="on-modal-overlay"
          onClick={() => setViewingAnnouncement(null)}
        >
          <div className="on-modal" onClick={(e) => e.stopPropagation()}>
            <div className="on-modal-header">
              <div className="on-modal-badge">
                <FaEnvelope />
                Announcement
              </div>
              <button
                type="button"
                className="on-modal-close-btn"
                onClick={() => setViewingAnnouncement(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {loadingAnnouncement ? (
              <p className="on-modal-loading">Loading…</p>
            ) : (
              <>
                {viewingAnnouncement.title && (
                  <h3 className="on-modal-title">
                    {viewingAnnouncement.title}
                  </h3>
                )}
                <p className="on-modal-message">
                  {viewingAnnouncement.message}
                </p>
              </>
            )}

            <span className="on-modal-time">
              {timeAgo(viewingAnnouncement.createdAt)}
            </span>
          </div>
        </div>
      )}

      <CompleteProfileModal
        isOpen={showCompleteProfile}
        token={authToken}
        initialFirstName={user?.firstName}
        initialLastName={user?.lastName}
        onComplete={handleProfileComplete}
      />
    </>
  );
}
