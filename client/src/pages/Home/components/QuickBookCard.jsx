export default function QuickBookCard({ hotel }) {
  return (
    <button className="quickbook-card">
      <img src={hotel.image} alt={hotel.name} />
      <div className="quickbook-info">
        <strong>{hotel.name}</strong>
        <span>₱{hotel.price} / night</span>
      </div>
    </button>
  );
}
