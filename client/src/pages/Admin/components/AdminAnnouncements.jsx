import { useState, useEffect, useCallback } from "react";
import { FaBullhorn, FaTrash } from "react-icons/fa";
import { authFetch } from "../../../utils/api";

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("all");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const token = localStorage.getItem("token");

  const fetchAnnouncements = useCallback(async () => {
    if (!token) {
      setAnnouncements([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await authFetch("/api/admin/announcements");
      if (!result.ok) {
        setError(result.data?.message || "Failed to load announcements.");
        return;
      }
      setAnnouncements(result.data?.announcements || []);
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    if (!title.trim() || !message.trim()) {
      setFormError("Title and message are required.");
      return;
    }

    setSending(true);
    try {
      const result = await authFetch("/api/admin/announcements", {
        method: "POST",
        body: JSON.stringify({ title, message, audience }),
      });

      if (!result.ok) {
        setFormError(result.data?.message || "Failed to send announcement.");
        return;
      }

      setSuccessMsg(
        `Sent to ${result.data?.recipientCount} user${result.data?.recipientCount === 1 ? "" : "s"}.`,
      );
      setTitle("");
      setMessage("");
      setAudience("all");
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this announcement record?")) return;
    try {
      const result = await authFetch(`/api/admin/announcements/${id}`, {
        method: "DELETE",
      });
      if (!result.ok) {
        alert("Failed to delete.");
        return;
      }
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    }
  }

  return (
    <div className="announcement-shell">
      <div className="announcement-page">
        <div className="announcement-panel">
          <h1 className="announcement-section-title">Announcements</h1>
          <p className="announcement-subtitle">
            Send a notice to guests, owners, or everyone on the platform.
          </p>

          <form className="announcement-form" onSubmit={handleSubmit}>
            <div className="announcement-field">
              <label className="announcement-label">Title</label>
              <input
                className="form-input announcement-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Scheduled maintenance tonight"
              />
            </div>

            <div className="announcement-field">
              <label className="announcement-label">Message</label>
              <textarea
                className="form-textarea announcement-textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Write the full announcement…"
              />
            </div>

            <div className="announcement-field">
              <label className="announcement-label">Audience</label>
              <select
                className="form-select announcement-select"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              >
                <option value="all">Everyone</option>
                <option value="guest">Guests only</option>
                <option value="owner">Owners only</option>
              </select>
            </div>

            {formError && (
              <p className="announcement-form-message announcement-form-message--error">
                {formError}
              </p>
            )}
            {successMsg && (
              <p className="announcement-form-message announcement-form-message--success">
                {successMsg}
              </p>
            )}

            <button type="submit" className="announcement-btn" disabled={sending}>
              <FaBullhorn size={12} />
              {sending ? "Sending…" : "Send Announcement"}
            </button>
          </form>
        </div>

        <div className="announcement-panel">
          <h2 className="announcement-section-title" style={{ fontSize: "1.1rem" }}>
            Past Announcements
          </h2>

          {loading ? (
            <p className="announcement-loading">Loading…</p>
          ) : error ? (
            <p className="announcement-status announcement-form-message--error">{error}</p>
          ) : announcements.length === 0 ? (
            <p className="announcement-empty">No announcements sent yet.</p>
          ) : (
            <div className="announcement-list">
              {announcements.map((a) => (
                <div key={a.id} className="announcement-item">
                  <div className="announcement-item-body">
                    <div className="announcement-item-header">
                      <span>{a.title}</span>
                      <span className="announcement-badge">
                        {a.audience === "all" ? "everyone" : a.audience}
                      </span>
                    </div>
                    <p className="announcement-item-message">{a.message}</p>
                    <span className="announcement-item-time">
                      {new Date(a.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="announcement-item-actions">
                    <button
                      type="button"
                      className="announcement-inline-icon-btn"
                      onClick={() => handleDelete(a.id)}
                      aria-label="Delete"
                    >
                      <FaTrash size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
