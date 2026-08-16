export default function FeatureCard({ icon, colorClass, title, description }) {
  return (
    <div className="feature-card">
      <div className={`feature-icon ${colorClass}`}>{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
