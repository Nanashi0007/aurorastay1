import { useRef, useState } from "react";
import {
  FaDatabase,
  FaDownload,
  FaUpload,
  FaShieldAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaFileAlt,
  FaLock,
  FaTimes,
  FaCloudDownloadAlt,
  FaSyncAlt,
  FaCopy,
} from "react-icons/fa";
import { getStoredAdminAuth } from "../../../utils/storage";
import "../../../styles/backupRestore.css";
import { API_BASE } from "../../../config";

const CONFIRM_PHRASE = "RESTORE DATABASE";
const BACKUP_ENDPOINT = `${API_BASE}/api/admin/backup`;

async function compressFile(file) {
  const stream = file.stream().pipeThrough(new CompressionStream("gzip"));
  const compressedBlob = await new Response(stream).blob();
  return new File([compressedBlob], file.name + ".gz", {
    type: "application/gzip",
  });
}

export default function BackupRestore() {
  const { token } = getStoredAdminAuth();

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [lastChecksum, setLastChecksum] = useState("");

  const [file, setFile] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState("");
  const [restoreSuccess, setRestoreSuccess] = useState("");

  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef(null);

  /*
   * ---------------------------------------------------------
   * DOWNLOAD BACKUP
   * ---------------------------------------------------------
   */
  async function handleDownload() {
    setDownloading(true);
    setDownloadError("");
    setLastChecksum("");
    setRestoreSuccess("");

    try {
      const res = await fetch(`${BACKUP_ENDPOINT}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Backup failed.");
      }

      const blob = await res.blob();

      // Calculate SHA-256 checksum
      const buffer = await blob.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);

      const hashArray = Array.from(new Uint8Array(hashBuffer));

      const checksum = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      setLastChecksum(checksum);

      // Get filename from Content-Disposition
      const disposition = res.headers.get("Content-Disposition") || "";

      const match = disposition.match(/filename="?([^"]+)"?/);

      const filename = match ? match[1] : `backup-${Date.now()}.sql`;

      // Download file
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

  /*
   * ---------------------------------------------------------
   * FILE VALIDATION
   * ---------------------------------------------------------
   */
  function validateFile(selectedFile) {
    if (!selectedFile) {
      return null;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".sql")) {
      setRestoreError("Only .sql backup files are accepted.");

      setFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return null;
    }

    setRestoreError("");
    setRestoreSuccess("");

    return selectedFile;
  }

  /*
   * ---------------------------------------------------------
   * FILE INPUT
   * ---------------------------------------------------------
   */
  function handleFileChange(e) {
    const selectedFile = e.target.files?.[0] || null;

    const validFile = validateFile(selectedFile);

    if (validFile) {
      setFile(validFile);
    }
  }

  /*
   * ---------------------------------------------------------
   * DRAG & DROP
   * ---------------------------------------------------------
   */
  function handleDragOver(e) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setDragActive(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0] || null;

    const validFile = validateFile(droppedFile);

    if (validFile) {
      setFile(validFile);
    }
  }

  /*
   * ---------------------------------------------------------
   * REMOVE FILE
   * ---------------------------------------------------------
   */
  function handleRemoveFile() {
    setFile(null);
    setRestoreError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  /*
   * ---------------------------------------------------------
   * OPEN RESTORE MODAL
   * ---------------------------------------------------------
   */
  function openRestoreModal() {
    setRestoreError("");
    setRestoreSuccess("");

    if (!file) {
      setRestoreError("Select a .sql backup file first.");
      return;
    }

    setShowRestoreModal(true);
  }

  /*
   * ---------------------------------------------------------
   * CLOSE RESTORE MODAL
   * ---------------------------------------------------------
   */
  function closeRestoreModal() {
    if (restoring) {
      return;
    }

    setShowRestoreModal(false);
    setPassword("");
    setConfirmText("");
    setRestoreError("");
  }

  /*
   * ---------------------------------------------------------
   * RESTORE DATABASE
   * ---------------------------------------------------------
   */
  async function handleRestore(e) {
    e.preventDefault();

    setRestoreError("");
    setRestoreSuccess("");

    if (!file) {
      setRestoreError("Select a .sql backup file first.");
      return;
    }

    if (confirmText !== CONFIRM_PHRASE) {
      setRestoreError(`Type "${CONFIRM_PHRASE}" exactly to confirm.`);
      return;
    }

    setRestoring(true);

    try {
      const compressedFile = await compressFile(file);
      const formData = new FormData();

      formData.append("backupFile", compressedFile);
      formData.append("password", password);
      formData.append("confirmText", confirmText);

      const res = await fetch(`${BACKUP_ENDPOINT}/restore`, {
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

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setShowRestoreModal(false);
    } catch (err) {
      setRestoreError(err.message || "Restore failed.");
    } finally {
      setRestoring(false);
    }
  }

  /*
   * ---------------------------------------------------------
   * FORMAT FILE SIZE
   * ---------------------------------------------------------
   */
  function formatFileSize(bytes) {
    if (!bytes) {
      return "0 Bytes";
    }

    const units = ["Bytes", "KB", "MB", "GB"];

    const index = Math.floor(Math.log(bytes) / Math.log(1024));

    return `${(bytes / Math.pow(1024, index)).toFixed(
      index === 0 ? 0 : 2,
    )} ${units[index]}`;
  }

  /*
   * ---------------------------------------------------------
   * COPY CHECKSUM
   * ---------------------------------------------------------
   */
  async function handleCopyChecksum() {
    if (!lastChecksum) {
      return;
    }

    try {
      await navigator.clipboard.writeText(lastChecksum);
    } catch {
      // Clipboard may not be available in some browsers.
    }
  }

  return (
    <div className="backup-restore-page">
      {/* =====================================================
          PAGE HEADER
      ====================================================== */}
      <header className="backup-page-header">
        <div className="backup-header-icon">
          <FaDatabase />
        </div>

        <div className="backup-header-content">
          <div className="backup-header-eyebrow">ADMINISTRATION</div>

          <h1>Database Maintenance</h1>

          <p>
            Create secure database backups and restore AuroraStay data when
            necessary.
          </p>
        </div>
      </header>

      {/* =====================================================
          DATABASE PROTECTION BANNER
      ====================================================== */}
      <section className="backup-protection-card">
        <div className="backup-protection-icon">
          <FaShieldAlt />
        </div>

        <div className="backup-protection-content">
          <h2>Database Protection</h2>

          <p>
            Regular backups help protect accommodation listings, reservations,
            user accounts, and other important AuroraStay data.
          </p>
        </div>

        <div className="backup-protection-status">
          <span className="backup-status-dot"></span>

          <span>Backup tools ready</span>
        </div>
      </section>

      {/* =====================================================
          SUCCESS MESSAGE
      ====================================================== */}
      {restoreSuccess && (
        <div className="backup-alert backup-alert-success">
          <div className="backup-alert-icon">
            <FaCheckCircle />
          </div>

          <div>
            <strong>Database restored</strong>
            <p>{restoreSuccess}</p>
          </div>

          <button
            type="button"
            className="backup-alert-close"
            onClick={() => setRestoreSuccess("")}
          >
            <FaTimes />
          </button>
        </div>
      )}

      {/* =====================================================
          MAIN GRID
      ====================================================== */}
      <div className="backup-main-grid">
        {/* ===================================================
            CREATE BACKUP
        ==================================================== */}
        <section className="backup-card">
          <div className="backup-card-header">
            <div className="backup-card-icon backup-icon-blue">
              <FaDownload />
            </div>

            <div>
              <h2>Create Backup</h2>

              <p>Download a complete SQL copy of the current database.</p>
            </div>
          </div>

          <div className="backup-card-body">
            <div className="backup-feature-list">
              <div className="backup-feature">
                <FaCheckCircle />
                <span>Complete PostgreSQL database dump</span>
              </div>

              <div className="backup-feature">
                <FaCheckCircle />
                <span>SQL format for future restoration</span>
              </div>

              <div className="backup-feature">
                <FaCheckCircle />
                <span>SHA-256 checksum generated</span>
              </div>
            </div>

            <button
              type="button"
              className="backup-primary-button"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <>
                  <FaSyncAlt className="backup-spin" />
                  Preparing backup...
                </>
              ) : (
                <>
                  <FaCloudDownloadAlt />
                  Download Backup
                </>
              )}
            </button>

            {downloadError && (
              <div className="backup-inline-error">
                <FaExclamationTriangle />
                <span>{downloadError}</span>
              </div>
            )}
          </div>
        </section>

        {/* ===================================================
            RESTORE BACKUP
        ==================================================== */}
        <section className="backup-card">
          <div className="backup-card-header">
            <div className="backup-card-icon backup-icon-purple">
              <FaUpload />
            </div>

            <div>
              <h2>Restore Database</h2>

              <p>Restore AuroraStay using a previous SQL database backup.</p>
            </div>
          </div>

          <div className="backup-card-body">
            {/* Upload area */}
            {!file ? (
              <button
                type="button"
                className={`backup-upload-zone ${
                  dragActive ? "backup-upload-zone-active" : ""
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="backup-upload-icon">
                  <FaUpload />
                </div>

                <strong>Choose a SQL backup</strong>

                <span>Click to browse or drag and drop</span>

                <small>Only .sql files are accepted</small>
              </button>
            ) : (
              <div className="backup-selected-file">
                <div className="backup-file-icon">
                  <FaFileAlt />
                </div>

                <div className="backup-file-info">
                  <strong>{file.name}</strong>

                  <span>{formatFileSize(file.size)}</span>
                </div>

                <button
                  type="button"
                  className="backup-remove-file"
                  onClick={handleRemoveFile}
                  aria-label="Remove backup file"
                >
                  <FaTimes />
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".sql,application/sql,text/plain,text/x-sql,.txt"
              onChange={handleFileChange}
              className="backup-hidden-file-input"
            />

            <button
              type="button"
              className="backup-secondary-button"
              disabled={!file}
              onClick={openRestoreModal}
            >
              <FaSyncAlt />
              Continue to Restore
            </button>

            {restoreError && !showRestoreModal && (
              <div className="backup-inline-error">
                <FaExclamationTriangle />
                <span>{restoreError}</span>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* =====================================================
          CHECKSUM
      ====================================================== */}
      {lastChecksum && (
        <section className="backup-checksum-card">
          <div className="backup-checksum-icon">
            <FaShieldAlt />
          </div>

          <div className="backup-checksum-content">
            <div className="backup-checksum-heading">
              <div>
                <span className="backup-section-label">
                  BACKUP VERIFICATION
                </span>

                <h3>SHA-256 Checksum</h3>
              </div>

              <span className="backup-verified-badge">
                <FaCheckCircle />
                Verified
              </span>
            </div>

            <p>
              Keep this checksum if you need to verify the integrity of the
              downloaded backup later.
            </p>

            <div className="backup-checksum-value">
              <code>{lastChecksum}</code>

              <button
                type="button"
                onClick={handleCopyChecksum}
                title="Copy checksum"
              >
                <FaCopy />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          DANGER ZONE
      ====================================================== */}
      <section className="backup-danger-zone">
        <div className="backup-danger-header">
          <div className="backup-danger-icon">
            <FaExclamationTriangle />
          </div>

          <div>
            <span className="backup-section-label">DANGER ZONE</span>

            <h2>Restore database</h2>

            <p>
              Restoring a backup replaces the current live database. Existing
              data may be overwritten.
            </p>
          </div>
        </div>

        <div className="backup-danger-content">
          <div className="backup-danger-warning">
            <FaExclamationTriangle />

            <span>
              Only restore a backup when you are certain that the selected SQL
              file is correct.
            </span>
          </div>

          <button
            type="button"
            className="backup-danger-button"
            onClick={openRestoreModal}
            disabled={!file}
          >
            <FaSyncAlt />
            Restore Database
          </button>
        </div>
      </section>

      {/* =====================================================
          RESTORE CONFIRMATION MODAL
      ====================================================== */}
      {showRestoreModal && (
        <div
          className="backup-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !restoring) {
              closeRestoreModal();
            }
          }}
        >
          <div className="backup-modal">
            <div className="backup-modal-header">
              <div className="backup-modal-warning-icon">
                <FaExclamationTriangle />
              </div>

              <button
                type="button"
                className="backup-modal-close"
                onClick={closeRestoreModal}
                disabled={restoring}
              >
                <FaTimes />
              </button>
            </div>

            <div className="backup-modal-content">
              <span className="backup-section-label">DATABASE RESTORE</span>

              <h2>Are you sure you want to restore?</h2>

              <p>
                This action will replace the current database with the contents
                of the selected backup. Make sure you have a recent backup
                before continuing.
              </p>

              {/* Selected file */}
              {file && (
                <div className="backup-modal-file">
                  <FaFileAlt />

                  <div>
                    <strong>{file.name}</strong>
                    <span>{formatFileSize(file.size)}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleRestore}>
                <label className="backup-modal-field">
                  <span>
                    <FaLock />
                    Admin Password
                  </span>

                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Enter your admin password"
                    disabled={restoring}
                  />
                </label>

                <label className="backup-modal-field">
                  <span>
                    Type <code>{CONFIRM_PHRASE}</code> to confirm
                  </span>

                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={CONFIRM_PHRASE}
                    disabled={restoring}
                    autoComplete="off"
                  />
                </label>

                {restoreError && (
                  <div className="backup-modal-error">
                    <FaExclamationTriangle />

                    <span>{restoreError}</span>
                  </div>
                )}

                <div className="backup-modal-actions">
                  <button
                    type="button"
                    className="backup-modal-cancel"
                    onClick={closeRestoreModal}
                    disabled={restoring}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="backup-modal-confirm"
                    disabled={restoring}
                  >
                    {restoring ? (
                      <>
                        <FaSyncAlt className="backup-spin" />
                        Restoring...
                      </>
                    ) : (
                      <>
                        <FaSyncAlt />
                        Confirm Restore
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
