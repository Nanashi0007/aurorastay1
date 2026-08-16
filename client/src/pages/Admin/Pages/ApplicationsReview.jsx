import { useState, useEffect } from "react";
import { FaCheck, FaTimes, FaSyncAlt, FaSearch } from "react-icons/fa";
import "../../../styles/Admin/ApplicationsReview.css"; // adjust path to where you save it

function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function ApplicationsReview() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [processingId, setProcessingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [viewingImage, setViewingImage] = useState(null);
  const [search, setSearch] = useState("");
  const [approvingId, setApprovingId] = useState(null);

  const token = localStorage.getItem("token");

  async function fetchApplications() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/applications?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to load applications.");
        return;
      }
      setApplications(data.applications || []);
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function handleApprove(id) {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/applications/${id}/approve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to approve.");
        return;
      }
      setApplications((prev) => prev.filter((a) => a.id !== id));
      setApprovingId(null);
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(id) {
    if (!rejectReason.trim()) return;
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/applications/${id}/reject`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to reject.");
        return;
      }
      setApplications((prev) => prev.filter((a) => a.id !== id));
      setRejectingId(null);
      setRejectReason("");
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="ar-page">
      <div className="ar-header">
        <div>
          <h1 className="ar-title">Host Applications</h1>
          <p className="ar-subtitle">
            Review proof of ownership and government ID before approving hosts.
          </p>
        </div>

        <div className="ar-filter-row">
          <input
            type="text"
            className="ar-search-input"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchApplications()}
          />
          <button
            type="button"
            className="ar-search-btn"
            onClick={fetchApplications}
            aria-label="Search"
          >
            <FaSearch size={13} />
          </button>

          <select
            className="ar-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="">All</option>
          </select>

          <button
            type="button"
            className="ar-refresh-btn"
            onClick={fetchApplications}
            aria-label="Refresh"
          >
            <FaSyncAlt size={13} />
          </button>
        </div>
      </div>

      {loading ? (
        <p className="ar-loading">Loading applications…</p>
      ) : error ? (
        <p className="ar-error">{error}</p>
      ) : applications.length === 0 ? (
        <p className="ar-empty">No applications found.</p>
      ) : (
        <div className="ar-list">
          {applications.map((app) => (
            <div className="ar-card" key={app.id}>
              <div className="ar-avatar">{initials(app.fullName)}</div>

              <div className="ar-info">
                <div className="ar-name-row">
                  <span className="ar-name">{app.fullName}</span>
                  <span className={`ar-status-badge ${app.status}`}>
                    {app.status}
                  </span>
                </div>
                <div className="ar-contact">
                  <a href={`mailto:${app.email}`}>{app.email}</a>
                </div>
                <div className="ar-contact">{app.contactNumber}</div>
                <div className="ar-proof-type">Proof type: {app.proofType}</div>
              </div>

              <div className="ar-docs">
                {[
                  { label: "Proof of Ownership", url: app.proofFileUrl },
                  { label: "Gov ID (Front)", url: app.govIdFrontUrl },
                  { label: "Gov ID (Back)", url: app.govIdBackUrl },
                ].map(
                  (doc) =>
                    doc.url && (
                      <div className="ar-doc" key={doc.label}>
                        <span className="ar-doc-label">{doc.label}</span>
                        <button
                          type="button"
                          className="ar-doc-thumb"
                          onClick={() => setViewingImage(doc.url)}
                        >
                          <img src={doc.url} alt={doc.label} />
                        </button>
                      </div>
                    ),
                )}
              </div>

              {app.status === "pending" && (
                <div className="ar-actions">
                  <button
                    type="button"
                    className="ar-icon-btn approve"
                    disabled={processingId === app.id}
                    onClick={() => {
                      setRejectingId(null);
                      setApprovingId(approvingId === app.id ? null : app.id);
                    }}
                    aria-label="Approve"
                  >
                    <FaCheck size={14} />
                  </button>
                  <button
                    type="button"
                    className="ar-icon-btn reject"
                    disabled={processingId === app.id}
                    onClick={() => {
                      setApprovingId(null);
                      setRejectingId(rejectingId === app.id ? null : app.id);
                    }}
                    aria-label="Reject"
                  >
                    <FaTimes size={14} />
                  </button>
                </div>
              )}

              {approvingId === app.id && (
                <div className="ar-confirm-panel">
                  <p className="ar-confirm-text">
                    Approve <strong>{app.fullName}</strong>'s application?
                    They'll be granted host access.
                  </p>
                  <div className="ar-reject-panel-actions">
                    <button
                      type="button"
                      className="ar-btn-cancel"
                      onClick={() => setApprovingId(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="ar-btn-confirm-approve"
                      disabled={processingId === app.id}
                      onClick={() => handleApprove(app.id)}
                    >
                      {processingId === app.id
                        ? "Approving…"
                        : "Confirm Approve"}
                    </button>
                  </div>
                </div>
              )}

              {rejectingId === app.id && (
                <div className="ar-reject-panel">{/* ...unchanged... */}</div>
              )}

              {rejectingId === app.id && (
                <div className="ar-reject-panel">
                  <textarea
                    className="ar-reject-textarea"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Reason for rejection (shown to the applicant)"
                    rows={2}
                  />
                  <div className="ar-reject-panel-actions">
                    <button
                      type="button"
                      className="ar-btn-cancel"
                      onClick={() => {
                        setRejectingId(null);
                        setRejectReason("");
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="ar-btn-confirm-reject"
                      disabled={!rejectReason.trim() || processingId === app.id}
                      onClick={() => handleReject(app.id)}
                    >
                      {processingId === app.id
                        ? "Rejecting…"
                        : "Confirm Reject"}
                    </button>
                  </div>
                </div>
              )}

              {app.status === "rejected" && app.rejectionReason && (
                <p className="ar-rejection-note">
                  Reason: {app.rejectionReason}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {viewingImage && (
        <div className="ar-lightbox" onClick={() => setViewingImage(null)}>
          <img src={viewingImage} alt="Document" />
        </div>
      )}
    </div>
  );
}
