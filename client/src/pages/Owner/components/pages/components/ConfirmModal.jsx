import { FaExclamationTriangle } from "react-icons/fa";

export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <div className="confirm-overlay" role="dialog" aria-modal="true">
      <div className="confirm-modal">
        <div className={`confirm-icon ${danger ? "danger" : ""}`}>
          <FaExclamationTriangle />
        </div>
        <h3>{title}</h3>
        <p>{message}</p>

        <div className="confirm-actions">
          <button
            type="button"
            className="btn-link"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
