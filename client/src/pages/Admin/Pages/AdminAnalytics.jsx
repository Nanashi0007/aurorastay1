import { useState, useEffect } from "react";
import { FaFileDownload } from "react-icons/fa";
import OverviewTab from "./AnalyticsTabs/OverviewTab";
import ListingsTab from "./AnalyticsTabs/ListingsTab";
import BookingsTab from "./AnalyticsTabs/BookingsTab";
import GrowthTab from "./AnalyticsTabs/GrowthTab";
import ReportsModal from "../components/ReportsModal";
import "../../../styles/Admin/adminAnalytics.css";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "listings", label: "Listings" },
  { key: "bookings", label: "Bookings & Revenue" },
  { key: "growth", label: "Growth" },
];

export default function AdminAnalytics() {
  const [activeTab, setActiveTab] = useState("overview");
  const [reportsModalOpen, setReportsModalOpen] = useState(false);

  return (
    <div className="admin-analytics">
      <div className="admin-analytics-topbar">
        <div className="admin-analytics-tabbar">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`admin-analytics-tab ${activeTab === tab.key ? "is-active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="btn btn-outline admin-analytics-reports-btn"
          onClick={() => setReportsModalOpen(true)}
        >
          <FaFileDownload /> Generate report
        </button>
      </div>

      <div className="admin-analytics-body">
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "listings" && <ListingsTab />}
        {activeTab === "bookings" && <BookingsTab />}
        {activeTab === "growth" && <GrowthTab />}
      </div>

      <ReportsModal
        isOpen={reportsModalOpen}
        onClose={() => setReportsModalOpen(false)}
      />
    </div>
  );
}
