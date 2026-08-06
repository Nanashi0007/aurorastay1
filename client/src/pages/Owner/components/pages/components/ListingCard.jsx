import { useNavigate } from "react-router-dom";
import {
  FaBed,
  FaUserFriends,
  FaMoneyBillWave,
  FaPen,
  FaTrashAlt,
} from "react-icons/fa";

const STATUS_LABELS = {
  active: { label: "Active", className: "status-active" },
  hidden: { label: "Hidden", className: "status-hidden" },
  archived: { label: "Archived", className: "status-archived" },
};

export default function ListingCard({ listing, onView, onEdit, onDelete }) {
  const navigate = useNavigate();
  const statusInfo = STATUS_LABELS[listing.status] || STATUS_LABELS.active;
  const hasRooms = listing.roomTypeCount > 0;

  return (
    <div
      className="listing-card"
      onClick={() => navigate(`/owner/listings/${listing.id}`)}
      style={{ cursor: "pointer" }}
    >
      <div className="listing-card-image">
        {listing.coverImageUrl ? (
          <img src={listing.coverImageUrl} alt={listing.title} />
        ) : (
          <div className="listing-card-image-fallback">
            <FaBed />
          </div>
        )}
        <span className={`listing-status-badge ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
      </div>

      <div className="listing-card-body">
        <div className="listing-card-top">
          <h3 className="listing-card-title">{listing.title}</h3>
        </div>

        <span className="listing-card-type">
          {hasRooms
            ? `${listing.roomTypeCount} room type${listing.roomTypeCount > 1 ? "s" : ""}`
            : "No rooms added yet"}
        </span>

        {listing.description && (
          <p className="listing-card-desc">{listing.description}</p>
        )}

        {hasRooms && (
          <div className="listing-card-meta">
            <span className="listing-card-meta-item">
              <FaUserFriends />
              Up to {listing.maxGuestsAcrossRooms} guest
              {listing.maxGuestsAcrossRooms > 1 ? "s" : ""}
            </span>
            <span className="listing-card-meta-item">
              <FaBed />
              {listing.totalRoomsAvailable} room
              {listing.totalRoomsAvailable > 1 ? "s" : ""} left
            </span>
          </div>
        )}

        <div className="listing-card-footer">
          {hasRooms ? (
            <span className="listing-card-price">
              <FaMoneyBillWave />
              from ₱{Number(listing.minPricePerNight).toLocaleString()}
              <small>/ night</small>
            </span>
          ) : (
            <span className="listing-card-price listing-card-price-empty">
              Price not set
            </span>
          )}
        </div>

        <div className="listing-card-actions">
          <button
            type="button"
            className="listing-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(listing);
            }}
          >
            <FaPen /> Edit
          </button>

          <button
            type="button"
            className="listing-action-btn listing-action-danger"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(listing);
            }}
          >
            <FaTrashAlt /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}
