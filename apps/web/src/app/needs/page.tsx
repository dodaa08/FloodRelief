import type { Metadata } from "next";
import { NeedsPage } from "@/components/needs/needs-page";

export const metadata: Metadata = {
  title: "Needs",
  description:
    "Report a need, or see open requests as a verified responder.",
};

export default function Needs() {
  return <NeedsPage />;
}