import { useState, useEffect, useCallback } from "react";
import {
  FaBullhorn,
  FaTrash,
  FaEdit,
  FaGlobeAmericas,
  FaUserFriends,
  FaHome,
} from "react-icons/fa";
import { authFetch } from "../../../utils/api";
import "../../../styles/Admin/admin-announcements.css";
import { API_BASE } from "../../../config"; // adjust relative path per file

const AUDIENCES = [
  { value: "all", label: "Everyone", icon: FaGlobeAmericas },
  { value: "guest", label: "Guests", icon: FaUserFriends },
  { value: "owner", label: "Owners", icon: FaHome },
];

const MESSAGE_MAX = 500;

function audienceMeta(value) {
  return AUDIENCES.find((a) => a.value === value) || AUDIENCES[0];
}

function formatTimestamp(value) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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

  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);

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
      const result = await authFetch(`${API_BASE}/api/admin/announcements`);
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
      const result = await authFetch(`${API_BASE}/api/admin/announcements`, {
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

  function startEdit(announcement) {
    setEditingId(announcement.id);
    setEditTitle(announcement.title);
    setEditMessage(announcement.message);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditMessage("");
    setEditError(null);
  }

  async function handleSaveEdit(id) {
    setEditError(null);

    if (!editTitle.trim() || !editMessage.trim()) {
      setEditError("Title and message are required.");
      return;
    }

    setEditSaving(true);
    try {
      const result = await authFetch(`/api/admin/announcements/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: editTitle, message: editMessage }),
      });

      if (!result.ok) {
        setEditError(result.data?.message || "Failed to update.");
        return;
      }

      setAnnouncements((prev) =>
        prev.map((a) => (a.id === id ? result.data.announcement : a)),
      );
      cancelEdit();
    } catch (err) {
      console.error(err);
      setEditError("Something went wrong.");
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div className="ann-shell">
      <div className="ann-page">
        {/* ============== COMPOSE PANEL ============== */}
        <section className="ann-panel ann-compose">
          <div className="ann-panel-head">
            <div className="ann-panel-icon">
              <FaBullhorn />
            </div>
            <div>
              <h1 className="ann-panel-title">New announcement</h1>
              <p className="ann-panel-subtitle">
                Send a notice to guests, owners, or everyone on the platform.
              </p>
            </div>
          </div>

          <form className="ann-form" onSubmit={handleSubmit}>
            <div className="ann-field">
              <label className="ann-label" htmlFor="ann-title">
                Title
              </label>
              <input
                id="ann-title"
                className="ann-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Scheduled maintenance tonight"
              />
            </div>

            <div className="ann-field">
              <div className="ann-label-row">
                <label className="ann-label" htmlFor="ann-message">
                  Message
                </label>
                <span
                  className={`ann-char-count ${
                    message.length > MESSAGE_MAX ? "over" : ""
                  }`}
                >
                  {message.length}/{MESSAGE_MAX}
                </span>
              </div>
              <textarea
                id="ann-message"
                className="ann-textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Write the full announcement…"
              />
            </div>

            <div className="ann-field">
              <label className="ann-label">Audience</label>
              <div
                className="ann-segmented"
                role="radiogroup"
                aria-label="Audience"
              >
                {AUDIENCES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={audience === value}
                    className={`ann-segment ${audience === value ? "is-active" : ""}`}
                    onClick={() => setAudience(value)}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {formError && (
              <p className="ann-message ann-message-error">{formError}</p>
            )}
            {successMsg && (
              <p className="ann-message ann-message-success">{successMsg}</p>
            )}

            <button type="submit" className="ann-submit-btn" disabled={sending}>
              <FaBullhorn size={13} />
              {sending ? "Sending…" : "Send announcement"}
            </button>
          </form>
        </section>

        {/* ============== HISTORY PANEL ============== */}
        <section className="ann-panel ann-history">
          <div className="ann-panel-head ann-panel-head-compact">
            <h2 className="ann-panel-title ann-panel-title-sm">
              Past announcements
            </h2>
            {!loading && announcements.length > 0 && (
              <span className="ann-count-pill">{announcements.length}</span>
            )}
          </div>

          {loading ? (
            <div className="ann-state">
              <div className="ann-spinner" aria-hidden="true" />
              <span>Loading announcements…</span>
            </div>
          ) : error ? (
            <div className="ann-state ann-state-error">
              <span>{error}</span>
            </div>
          ) : announcements.length === 0 ? (
            <div className="ann-empty">
              <FaBullhorn className="ann-empty-icon" aria-hidden="true" />
              <strong>No announcements yet</strong>
              <span>Sent announcements will appear here.</span>
            </div>
          ) : (
            <div className="ann-list">
              {announcements.map((a) => {
                const meta = audienceMeta(a.audience);
                const Icon = meta.icon;

                return editingId === a.id ? (
                  <div key={a.id} className="ann-item ann-item-editing">
                    <div className="ann-field">
                      <label className="ann-label">Title</label>
                      <input
                        className="ann-input"
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                      />
                    </div>
                    <div className="ann-field">
                      <label className="ann-label">Message</label>
                      <textarea
                        className="ann-textarea"
                        value={editMessage}
                        onChange={(e) => setEditMessage(e.target.value)}
                        rows={3}
                      />
                    </div>

                    {editError && (
                      <p className="ann-message ann-message-error">
                        {editError}
                      </p>
                    )}

                    <div className="ann-item-actions ann-item-actions-edit">
                      <button
                        type="button"
                        className="ann-save-btn"
                        onClick={() => handleSaveEdit(a.id)}
                        disabled={editSaving}
                      >
                        {editSaving ? "Saving…" : "Save changes"}
                      </button>
                      <button
                        type="button"
                        className="ann-cancel-btn"
                        onClick={cancelEdit}
                        disabled={editSaving}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={a.id} className={`ann-item ann-item-${a.audience}`}>
                    <div className="ann-item-icon">
                      <Icon size={13} />
                    </div>

                    <div className="ann-item-body">
                      <div className="ann-item-header">
                        <span className="ann-item-title">{a.title}</span>
                        <span className={`ann-badge ann-badge-${a.audience}`}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="ann-item-message">{a.message}</p>
                      <span className="ann-item-time">
                        {formatTimestamp(a.createdAt)}
                      </span>
                    </div>

                    <div className="ann-item-actions">
                      <button
                        type="button"
                        className="ann-icon-btn"
                        onClick={() => startEdit(a)}
                        aria-label="Edit announcement"
                      >
                        <FaEdit size={13} />
                      </button>
                      <button
                        type="button"
                        className="ann-icon-btn ann-icon-btn-danger"
                        onClick={() => handleDelete(a.id)}
                        aria-label="Delete announcement"
                      >
                        <FaTrash size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
