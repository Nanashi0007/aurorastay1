export default function DestinationCard({ destination }) {
  return (
    <div className="destination-card">
      <img src={destination.image} alt={destination.name} />

      <div className="destination-overlay">
        <h3>{destination.name}</h3>
      </div>
    </div>
  );
}
