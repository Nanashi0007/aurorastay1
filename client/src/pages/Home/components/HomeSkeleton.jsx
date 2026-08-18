import "../../../styles/skeleton.css";
export default function HomeSkeleton() {
  return (
    <div
      className="skeleton-wrapper"
      aria-busy="true"
      aria-label="Loading content"
    >
      {/* Hero skeleton */}
      <div className="skeleton-hero">
        <div className="skeleton skeleton-hero-title" />
        <div className="skeleton skeleton-hero-subtitle" />
        <div className="skeleton skeleton-hero-search" />
      </div>

      {/* Hotel cards skeleton */}
      <div className="skeleton-hotels-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div className="skeleton-hotel-card" key={i}>
            <div className="skeleton skeleton-card-image" />
            <div className="skeleton-card-body">
              <div className="skeleton skeleton-card-title" />
              <div className="skeleton skeleton-card-location" />
              <div className="skeleton skeleton-card-price" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
