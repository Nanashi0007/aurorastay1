import { useState, useEffect, useCallback } from "react";
import { FaSync } from "react-icons/fa";
import { getStoredAdminAuth } from "../../../utils/storage";
import "../../../styles/Admin/activityLogs.css";

const ACTIONS = [
  { value: "", label: "All actions" },
  { value: "application.approved", label: "Application approved" },
  { value: "application.rejected", label: "Application rejected" },
  { value: "user.role_changed", label: "User role changed" },
  { value: "user.suspended", label: "User suspended" },
  { value: "user.deleted", label: "User deleted" },
  { value: "listing.deactivated", label: "Listing deactivated" },
  { value: "announcement.created", label: "Announcement created" },
  { value: "report.generated", label: "Report generated" },
];

function formatDateTime(value) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const limit = 25;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { token } = getStoredAdminAuth(); // CHANGED
      const params = new URLSearchParams({ page, limit });
      if (action) params.set("action", action);
      const res = await fetch(`/api/admin/activity-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(body.message || "Failed to load activity logs.");
      setLogs(body.logs || []);
      setTotal(body.total || 0);
    } catch (err) {
      setError(err.message || "Failed to load activity logs.");
    } finally {
      setLoading(false);
    }
  }, [page, action]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="al-page">
      <div className="al-header">
        <div>
          <h1 className="al-title">Activity Logs</h1>
          <p className="al-subtitle">
            Track every admin action across the platform.
          </p>
        </div>
        <div className="al-filter-row">
          <select
            className="al-select"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
          >
            {ACTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="al-refresh-btn"
            onClick={fetchLogs}
            aria-label="Refresh"
          >
            <FaSync />
          </button>
        </div>
      </div>

      {loading && <p className="al-loading">Loading activity logs…</p>}
      {error && <p className="al-error">{error}</p>}

      {!loading && !error && (
        <>
          <div className="al-list">
            {logs.length === 0 && (
              <p className="al-empty">No activity found.</p>
            )}
            {logs.map((log) => (
              <div key={log.id} className="al-row">
                <div className="al-row-main">
                  <span className="al-admin-name">
                    {log.admin_name || "System"}
                  </span>
                  <span className="al-description">{log.description}</span>
                </div>
                <span className="al-timestamp">
                  {formatDateTime(log.created_at)}
                </span>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="al-pagination">
              <button
                type="button"
                className="al-page-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span className="al-page-indicator">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="al-page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
