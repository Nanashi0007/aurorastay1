import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authFetch } from "../../../utils/api";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import QuickBookCard from "../../../components/cards/QuickBookCard";
import SearchBar from "./SearchBar";
import "../../../styles/Hero.css";
import "../../../styles/recent.css";
import { API_BASE } from "../../../config"; // adjust relative path per file

export default function Hero({ hotels }) {
  const navigate = useNavigate();

  // --- Carousel state/refs ---
  const carouselRef = useRef(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const [recentlyViewedHotels, setRecentlyViewedHotels] = useState([]);

  useEffect(() => {
    async function fetchRecentlyViewed() {
      const result = await authFetch(`${API_BASE}/api/recently-viewed`);

      if (!result.ok) {
        setRecentlyViewedHotels([]);
        return;
      }

      setRecentlyViewedHotels(result.data?.hotels || []);
    }

    fetchRecentlyViewed();
  }, []);

  function updateScrollButtons() {
    const el = carouselRef.current;
    if (!el) return;
    setCanScrollPrev(el.scrollLeft > 4);
    setCanScrollNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    updateScrollButtons();
    const el = carouselRef.current;
    if (!el) return;

    el.addEventListener("scroll", updateScrollButtons);
    window.addEventListener("resize", updateScrollButtons);

    return () => {
      el.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [recentlyViewedHotels]);

  function scrollCarousel(direction) {
    const el = carouselRef.current;
    if (!el) return;
    const card = el.querySelector(".quickbook-card-wrap");
    const scrollAmount = card ? card.offsetWidth + 20 : el.clientWidth * 0.8;
    el.scrollBy({ left: direction * scrollAmount, behavior: "smooth" });
  }

  // Called by SearchBar when the user hits the search button
  function handleSearch({ destination, checkIn, checkOut, guests }) {
    const params = new URLSearchParams();

    if (destination) params.set("destination", destination);
    if (checkIn) params.set("checkIn", checkIn.toISOString().slice(0, 10));
    if (checkOut) params.set("checkOut", checkOut.toISOString().slice(0, 10));
    params.set("guests", guests);

    navigate(`/hotels?${params.toString()}`);
  }

  return (
    <section className="hero">
      <div className="hero-overlay">
        <div className="hero-content">
          <span className="hero-tag">Baler, Aurora · Surf coast</span>
          <h1>Find your stay on the Aurora coast</h1>
          <p className="hero-sub">
            Search a stay and book today — real rooms, real availability.
          </p>
        </div>

        <SearchBar onSearch={handleSearch} />
      </div>

      <div className="quickbook container">
        <div className="quickbook-head">
          <h3>Recently Viewed</h3>

          <div className="t">
            <Link to="/bookings?tab=recentlyViewed" className="browse-link">
              Browse More
              <FaChevronRight />
            </Link>
          </div>
        </div>

        {recentlyViewedHotels.length === 0 ? (
          <p className="quickbook-empty">
            Listings you view will show up here.
          </p>
        ) : (
          <div className="quickbook-carousel-wrap">
            <button
              type="button"
              className="quickbook-nav quickbook-nav-prev"
              onClick={() => scrollCarousel(-1)}
              disabled={!canScrollPrev}
              aria-label="Show previous recently viewed stays"
            >
              <FaChevronLeft />
            </button>

            <div className="quickbook-carousel" ref={carouselRef}>
              {recentlyViewedHotels.map((hotel) => (
                <div className="quickbook-card-wrap" key={hotel.id}>
                  <QuickBookCard hotel={hotel} />
                </div>
              ))}
            </div>

            <button
              type="button"
              className="quickbook-nav quickbook-nav-next"
              onClick={() => scrollCarousel(1)}
              disabled={!canScrollNext}
              aria-label="Show next recently viewed stays"
            >
              <FaChevronRight />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
