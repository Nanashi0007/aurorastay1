import { FaWifi, FaSwimmingPool, FaCar } from "react-icons/fa";

const features = [
  {
    icon: <FaWifi />,
    code: "WIFI",
    title: "Always connected",
    description: "Fast WiFi at every listing, verified before it's listed.",
  },
  {
    icon: <FaSwimmingPool />,
    code: "STAY",
    title: "Verified stays only",
    description: "Every hotel, inn, and homestay is checked in person.",
  },
  {
    icon: <FaCar />,
    code: "PARK",
    title: "Free parking",
    description: "Arriving by car? Most listings have you covered.",
  },
];

export default function FeaturesSection() {
  return (
    <section className="features">
      <div className="container">
        <div className="features-eyebrow">Trip essentials · No. 001</div>
        <h2>Why book with AuroraStay</h2>

        <div className="boarding-strip">
          {features.map((feature, i) => (
            <div className="boarding-item" key={feature.code}>
              <div className="boarding-icon">{feature.icon}</div>
              <div className="boarding-text">
                <span className="boarding-code">{feature.code}</span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
              {i < features.length - 1 && (
                <div className="boarding-perf" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
