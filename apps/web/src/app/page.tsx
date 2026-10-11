import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LiveMapBand } from "@/components/landing/live-map-band";

export default function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <LiveMapBand />
    </>
  );
}