"use client";

import dynamic from "next/dynamic";

const DashboardApp = dynamic(
  () => import("@/components/dashboard-app").then((mod) => mod.DashboardApp),
  {
    ssr: false,
    loading: () => (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ fontSize: "14px", color: "#64748b", fontWeight: 500 }}>Loading UAT Tracker...</div>
      </div>
    ),
  }
);

export default function Page() {
  return <DashboardApp />;
}
