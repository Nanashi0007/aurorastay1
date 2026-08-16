import { useState, useRef } from "react";
import "../../../styles/backupRestore.css";

const API_BASE = "/api/admin/backup";
const CONFIRM_PHRASE = "RESTORE DATABASE";

export default function BackupRestore() {
  const token = localStorage.getItem("token"); // ADJUST to your real admin token key

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [lastChecksum, setLastChecksum] = useState("");

  const [file, setFile] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState("");
  const [restoreSuccess, setRestoreSuccess] = useState("");
  const fileInputRef = useRef(null);

  async function handleDownload() {
    setDownloading(true);
    setDownloadError("");
    setLastChecksum("");

    try {
      const res = await fetch(`${API_BASE}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Backup failed.");
      }

      const blob = await res.blob();

      // Compute a SHA-256 checksum client-side so the admin has something
      // to visually verify against later, e.g. before trusting a restore.
      const buffer = await blob.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const checksum = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      setLastChecksum(checksum);

      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match ? match[1] : `backup-${Date.now()}.sql`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(err.message || "Backup failed.");
    } finally {
      setDownloading(false);
    }
  }

  function handleFileChange(e) {
    const selected = e.target.files?.[0] || null;
    if (selected && !selected.name.toLowerCase().endsWith(".sql")) {
      setRestoreError("Only .sql files are accepted.");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setRestoreError("");
    setFile(selected);
  }

  async function handleRestore(e) {
    e.preventDefault();
    setRestoreError("");
    setRestoreSuccess("");

    if (!file) {
      setRestoreError("Select a .sql backup file first.");
      return;
    }
    if (!password) {
      setRestoreError("Enter your admin password to confirm.");
      return;
    }
    if (confirmText !== CONFIRM_PHRASE) {
      setRestoreError(`Type "${CONFIRM_PHRASE}" exactly to confirm.`);
      return;
    }

    setRestoring(true);
    try {
      const formData = new FormData();
      formData.append("backupFile", file);
      formData.append("password", password);

      const res = await fetch(`${API_BASE}/restore`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Restore failed.");
      }

      setRestoreSuccess(data.message || "Database restored successfully.");
      setFile(null);
      setPassword("");
      setConfirmText("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setRestoreError(err.message || "Restore failed.");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="backup-restore-page">
      <h1>Database backup &amp; restore</h1>
      <p className="backup-warning">
        This is an emergency tool. Restoring will overwrite all current data. A
        safety backup of the current state is taken automatically before any
        restore runs.
      </p>

      <section className="backup-section">
        <h2>Download backup</h2>
        <p>Creates and downloads a full .sql dump of the database.</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? "Preparing backup…" : "Download backup"}
        </button>
        {downloadError && <p className="backup-error">{downloadError}</p>}
        {lastChecksum && (
          <p className="backup-checksum">
            SHA-256: <code>{lastChecksum}</code>
          </p>
        )}
      </section>

      <section className="backup-section restore-section">
        <h2>Restore from backup</h2>
        <p className="backup-warning-strong">
          This will overwrite the entire live database. Only proceed if you are
          certain this is the correct file.
        </p>

        <form onSubmit={handleRestore}>
          <label className="backup-field">
            Backup file (.sql)
            <input
              ref={fileInputRef}
              type="file"
              accept=".sql"
              onChange={handleFileChange}
            />
          </label>

          <label className="backup-field">
            Admin password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          <label className="backup-field">
            Type "{CONFIRM_PHRASE}" to confirm
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_PHRASE}
            />
          </label>

          <button type="submit" className="btn btn-danger" disabled={restoring}>
            {restoring ? "Restoring…" : "Restore database"}
          </button>

          {restoreError && <p className="backup-error">{restoreError}</p>}
          {restoreSuccess && <p className="backup-success">{restoreSuccess}</p>}
        </form>
      </section>
    </div>
  );
}
