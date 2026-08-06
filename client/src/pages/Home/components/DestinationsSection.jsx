import { Link } from "react-router-dom";
import { FaChevronRight } from "react-icons/fa";
import DestinationCard from "./DestinationCard";

export default function DestinationsSection({ destinations }) {
  return (
    <section className="destinations container">
      <div className="section-header">
        <div>
          <h2>Popular Destinations</h2>
        </div>

        <Link to="/more" className="browse-link">
          Browse More
          <FaChevronRight />
        </Link>
      </div>

      <div className="destination-grid">
        {destinations.map((item) => (
          <DestinationCard destination={item} key={item.id} />
        ))}
      </div>
    </section>
  );
}
