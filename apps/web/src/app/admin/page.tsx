import type { Metadata } from "next";
import { ApprovalsPage } from "@/components/admin/approvals-page";

export const metadata: Metadata = {
  title: "Approvals",
  description: "Approve or reject responder accounts.",
};

export default function AdminPage() {
  return <ApprovalsPage />;
}