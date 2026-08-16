import { Link } from "react-router-dom";
import { FaStar } from "react-icons/fa";

export default function QuickBookCard({ hotel }) {
  const rating = Number(hotel.rating ?? hotel.score);
  const hasRating = Number.isFinite(rating) && rating > 0;
  const numericPrice = Number(hotel.price);
  const hasPrice = Number.isFinite(numericPrice) && numericPrice > 0;
  // Rating is out of 10 from the API, convert to stars out of 5
  const starCount = hasRating ? Math.round(rating / 2) : 0;

  return (
    <Link to={`/hotels/${hotel.id}`} className="quickbook-card">
      <img src={hotel.image} alt={hotel.name} />
      <div className="quickbook-info">
        <strong>{hotel.name}</strong>
        {hasPrice ? (
          <span>₱{numericPrice.toLocaleString()} / night</span>
        ) : (
          <span className="quickbook-price-unavailable">Price unavailable</span>
        )}
        <span
          className="quickbook-stars"
          aria-label={`${starCount} out of 5 stars`}
        >
          {[1, 2, 3, 4, 5].map((s) => (
            <FaStar
              key={s}
              className={s <= starCount ? "star-filled" : "star-empty"}
            />
          ))}
        </span>
      </div>
    </Link>
  );
}
