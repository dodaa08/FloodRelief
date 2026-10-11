import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden py-12">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-[-120px] right-1/4 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl" />
      </div>

      <div className="flex w-full flex-col items-center px-4 sm:px-6">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Back to home
        </Link>
        <Logo size="lg" />
        <div className="mt-6 w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}