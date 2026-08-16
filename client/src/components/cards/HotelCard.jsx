import { FaStar, FaArrowRight, FaHeart, FaRegHeart } from "react-icons/fa";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addRecentlyViewed } from "../../utils/recentlyViewed";
import "../../styles/btnsmall.css";

export default function HotelCard({ hotel, isSaved = false, onToggleSave }) {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(isSaved);
  const [toggling, setToggling] = useState(false);
  // Rating is out of 10 from the API, convert to stars out of 5
  const rawRating = Number(hotel.rating ?? hotel.score);
  const hasRating = Number.isFinite(rawRating) && rawRating > 0;
  const starCount = hasRating ? Math.round(rawRating / 2) : 0;

  function handleView() {
    addRecentlyViewed(hotel.id);
    navigate(`/hotels/${hotel.id}`);
  }

  async function handleToggleSave(e) {
    e.stopPropagation(); // don't trigger card navigation
    if (toggling) return;

    const token = localStorage.getItem("token");
    if (!token) {
      onToggleSave?.("requireLogin");
      return;
    }

    setToggling(true);
    const next = !saved;
    setSaved(next); // optimistic update

    try {
      const res = await fetch(`/api/saved/${hotel.id}`, {
        method: next ? "POST" : "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setSaved(!next); // revert on failure
      } else {
        onToggleSave?.(next ? "saved" : "unsaved", hotel.id);
      }
    } catch (err) {
      console.error("Failed to toggle save:", err);
      setSaved(!next);
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="hotel-card">
      <div className="hotel-image">
        <img src={hotel.image} alt={hotel.name} />
        <span className="hotel-type">
          {hotel.icon}
          {hotel.type}
        </span>
        <button
          type="button"
          className={`hotel-save-btn${saved ? " is-saved" : ""}`}
          onClick={handleToggleSave}
          aria-label={saved ? "Remove from saved" : "Save listing"}
        >
          {saved ? <FaHeart /> : <FaRegHeart />}
        </button>
      </div>

      <div className="ticket-perforation" aria-hidden="true"></div>

      <div className="hotel-content">
        <div className="hotel-top">
          <div>
            <h3>{hotel.name}</h3>
            <p>{hotel.location}</p>
          </div>

          <div
            className="hotel-stars"
            aria-label={`${starCount} out of 5 stars`}
          >
            {[1, 2, 3, 4, 5].map((s) => (
              <FaStar
                key={s}
                className={s <= starCount ? "star-filled" : "star-empty"}
              />
            ))}
            {hasRating && (
              <span className="hotel-rating-score">{hotel.rating}</span>
            )}
          </div>
        </div>

        <span className="reviews">{hotel.reviews}</span>

        <div className="amenities">
          {hotel.amenities.map((item, index) => (
            <span key={index}>{item}</span>
          ))}
        </div>

        <span className="rooms-left">{hotel.rooms}</span>

        <div className="hotel-bottom">
          <div className="price-stamp">
            <small>from</small>
            <h2>₱{hotel.price}</h2>
            <small>per night</small>
          </div>

          <button
            className="btn btn-primary hotel-card-view-btn"
            onClick={handleView}
            aria-label={`View ${hotel.name}`}
          >
            {/* <FaArrowRight /> */}➜
          </button>
        </div>
      </div>
    </div>
  );
}
