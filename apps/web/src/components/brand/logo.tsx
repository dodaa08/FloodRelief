import Link from "next/link";
import { Waves } from "lucide-react";

const accent = "bg-gradient-to-br from-primary to-cyan-600";

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5">
      <span
        className={`${accent} grid place-items-center rounded-xl text-primary-foreground shadow-sm ${
          size === "lg" ? "h-11 w-11" : "h-9 w-9"
        }`}
      >
        <Waves className={size === "lg" ? "h-6 w-6" : "h-5 w-5"} />
      </span>
      <span className="text-lg font-semibold tracking-tight">
        Pukaar
        <span className="ml-1.5 hidden text-sm font-normal text-muted-foreground sm:inline">
          disaster relief
        </span>
      </span>
    </Link>
  );
}