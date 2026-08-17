import { useState, useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import "../../../styles/Admin/reportsModal.css";

export default function ReportsModal({ isOpen, onClose }) {
  const [types, setTypes] = useState([]);
  const [selectedType, setSelectedType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const token = localStorage.getItem("token");
    fetch("/api/admin/reports/types", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((body) => {
        setTypes(body.types || []);
        if (body.types?.length > 0) setSelectedType(body.types[0].key);
      })
      .catch(() => setError("Failed to load report types."));
  }, [isOpen]);

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleDownload(format) {
    if (!selectedType) return;
    setDownloading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(
        `/api/admin/reports/${selectedType}/${format}?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Export failed.");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match ? match[1] : `${selectedType}-report.${format}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Export failed.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="reports-modal-overlay" onClick={onClose}>
      <div className="reports-modal" onClick={(e) => e.stopPropagation()}>
        <div className="reports-modal-header">
          <h2>Generate report</h2>
          <button
            type="button"
            className="reports-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        <div className="reports-modal-body">
          <label className="reports-field">
            Report type
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              {types.map((type) => (
                <option key={type.key} value={type.key}>
                  {type.title}
                </option>
              ))}
            </select>
          </label>

          <div className="reports-date-row">
            <label className="reports-field">
              From (optional)
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>

            <label className="reports-field">
              To (optional)
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>

          {error && <p className="backup-error">{error}</p>}
        </div>

        <div className="reports-modal-footer">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => handleDownload("csv")}
            disabled={downloading || !selectedType}
          >
            {downloading ? "Preparing…" : "Download CSV"}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleDownload("pdf")}
            disabled={downloading || !selectedType}
          >
            {downloading ? "Preparing…" : "Download PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
