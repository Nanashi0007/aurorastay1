import { FaStar, FaChevronRight } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { addRecentlyViewed } from "../../../utils/recentlyViewed";
import "../../../styles/btnsmall.css";

export default function HotelCard({ hotel }) {
  const navigate = useNavigate();

  function handleView() {
    addRecentlyViewed(hotel.id);
    navigate(`/hotels/${hotel.id}`);
  }

  return (
    <div className="hotel-card">
      <div className="hotel-image">
        <img src={hotel.image} alt={hotel.name} />
        <span className="hotel-type">
          {hotel.icon}
          {hotel.type}
        </span>
      </div>

      <div className="ticket-perforation" aria-hidden="true"></div>

      <div className="hotel-content">
        <div className="hotel-top">
          <div>
            <h3>{hotel.name}</h3>
            <p>{hotel.location}</p>
          </div>
          <div className="hotel-rating">
            <FaStar />
            {hotel.rating}
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
            className="btn btn-primary"
            onClick={handleView}
            aria-label={`View ${hotel.name}`}
          >
            <FaChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
}
