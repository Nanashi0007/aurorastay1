import { FaCheckCircle } from "react-icons/fa";

export default function SuccessModal({ title, message, onClose }) {
  return (
    <div className="confirm-overlay" role="dialog" aria-modal="true">
      <div className="confirm-modal">
        <div className="confirm-icon success">
          <FaCheckCircle />
        </div>
        <h3>{title}</h3>
        <p>{message}</p>

        <div className="confirm-actions confirm-actions-center">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
