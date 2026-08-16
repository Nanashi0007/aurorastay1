import { FaWifi, FaSwimmingPool, FaParking } from "react-icons/fa";
import FeatureCard from "../../../components/cards/FeatureCard";

const features = [
  {
    icon: <FaWifi />,
    colorClass: "navy",
    title: "Free WiFi",
    description: "Stay connected during your vacation.",
  },
  {
    icon: <FaSwimmingPool />,
    colorClass: "gold",
    title: "Best Resorts",
    description: "Verified accommodations across Aurora.",
  },
  {
    icon: <FaParking />,
    colorClass: "green",
    title: "Free Parking",
    description: "Convenient parking for your vehicle.",
  },
];

export default function FeaturesSection() {
  return (
    <section className="features">
      <div className="container">
        <h2>Why Book with AuroraStay?</h2>

        <div className="feature-grid">
          {features.map((feature) => (
            <FeatureCard {...feature} key={feature.title} />
          ))}
        </div>
      </div>
    </section>
  );
}
