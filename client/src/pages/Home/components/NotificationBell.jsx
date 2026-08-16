import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../../../styles/NotificationBell.css"; // adjust path to where you save it

const API_BASE = "/api/notifications"; // adjust if you proxy differently

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

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewingAnnouncement, setViewingAnnouncement] = useState(null);
  const [loadingAnnouncement, setLoadingAnnouncement] = useState(false);

  const navigate = useNavigate();
  const containerRef = useRef(null);

  // Only a recent preview is shown in the bell dropdown; the full Gmail-style
  // list lives on the /owner/notification page.
  const RECENT_LIMIT = 8;
  const visibleNotifications = notifications.slice(0, RECENT_LIMIT);
  const remainingCount = notifications.length - RECENT_LIMIT;

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const fetchUnreadCount = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return; // don't fetch when logged out

    try {
      const res = await fetch(`${API_BASE}/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(data.count);
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  }, []);

  // Poll every 45s
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 45000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const toggleOpen = async () => {
    const next = !isOpen;
    setIsOpen(next);
    if (!next) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(API_BASE, { headers: authHeaders() });
      const data = await res.json();
      setNotifications(data.notifications || []);

      await fetch(`${API_BASE}/read-all`, {
        method: "PATCH",
        headers: authHeaders(),
      });
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="nb-container">
      <button
        onClick={toggleOpen}
        className="nb-bell-btn"
        aria-label="Notifications"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#374151"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="nb-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {viewingAnnouncement && (
        <div
          className="nb-modal-overlay"
          onClick={() => setViewingAnnouncement(null)}
        >
          <div className="nb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="nb-modal-header">
              <div className="nb-modal-badge">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 11l18-5v12L3 14v-3z" />
                  <path d="M11.6 16.8a3 3 0 0 1-5.8-1.6" />
                </svg>
                Announcement
              </div>
              <button
                type="button"
                className="nb-modal-close-btn"
                onClick={() => setViewingAnnouncement(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {loadingAnnouncement ? (
              <p className="nb-modal-loading">Loading…</p>
            ) : (
              <>
                {viewingAnnouncement.title && (
                  <h3 className="nb-modal-title">
                    {viewingAnnouncement.title}
                  </h3>
                )}
                <p className="nb-modal-message">
                  {viewingAnnouncement.message}
                </p>
              </>
            )}

            <span className="nb-modal-time">
              {timeAgo(viewingAnnouncement.createdAt)}
            </span>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="nb-dropdown">
          <div className="nb-dropdown-header">Notifications</div>

          <div className="nb-dropdown-body">
            {loading && <div className="nb-dropdown-loading">Loading…</div>}

            {!loading && notifications.length === 0 && (
              <div className="nb-dropdown-empty">No notifications yet.</div>
            )}

            {!loading &&
              visibleNotifications.map((n) => {
                const isClickable = !!(
                  n.relatedBookingId || n.relatedAnnouncementId
                );
                return (
                  <div
                    key={n.id}
                    onClick={async () => {
                      setIsOpen(false);
                      if (n.relatedAnnouncementId) {
                        setViewingAnnouncement({ createdAt: n.createdAt }); // show modal immediately with a loading state
                        setLoadingAnnouncement(true);
                        try {
                          const res = await fetch(
                            `/api/announcements/${n.relatedAnnouncementId}`,
                            { headers: authHeaders() },
                          );
                          const data = await res.json();
                          if (res.ok) {
                            setViewingAnnouncement(data.announcement);
                          } else {
                            setViewingAnnouncement({
                              title: "Announcement",
                              message: n.message,
                              createdAt: n.createdAt,
                            }); // fallback to the title-only text we already have
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
                        navigate(`/bookings?bookingId=${n.relatedBookingId}`);
                      }
                    }}
                    className={`nb-item ${n.read ? "" : "unread"} ${
                      isClickable ? "clickable" : "not-clickable"
                    }`}
                  >
                    <div className="nb-item-message">{n.message}</div>
                    <div className="nb-item-time">{timeAgo(n.createdAt)}</div>
                  </div>
                );
              })}
          </div>

          {!loading && remainingCount > 0 && (
            <div className="nb-dropdown-footer">
              <button
                type="button"
                className="nb-view-all-btn"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/owner/notification");
                }}
              >
                View All ({notifications.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
