import type { Metadata } from "next";
import { CreateNeedForm } from "@/components/needs/create-need-form";

export const metadata: Metadata = {
  title: "Report a need",
  description:
    "Tell us what's needed and where. A verified responder will confirm it.",
};

export default function NewNeedPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Report a need</h1>
        <p className="mt-1 text-muted-foreground">
          Share what&apos;s needed and where. A verified responder will confirm it with
          photos before it goes live.
        </p>
      </div>
      <CreateNeedForm />
    </div>
  );
}