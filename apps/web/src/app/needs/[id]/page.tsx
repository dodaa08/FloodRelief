import type { Metadata } from "next";
import { NeedBrief } from "@/components/needs/need-brief";

export const metadata: Metadata = {
  title: "Need brief",
  description: "Full details, photos, verification and activity for one reported need.",
};

// Per-id brief rendered at request time; the data itself loads client-side.
export const instant = false;

export default async function NeedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <NeedBrief id={id} />
    </div>
  );
}