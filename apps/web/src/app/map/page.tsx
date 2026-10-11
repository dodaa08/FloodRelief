import type { Metadata } from "next";
import { FloodMapPage } from "@/components/map/flood-map-page";

export const metadata: Metadata = {
  title: "Live flood map",
  description:
    "Real-time flood risk for every monitored district, from rainfall and river signals.",
};

export default function MapPage() {
  return <FloodMapPage />;
}