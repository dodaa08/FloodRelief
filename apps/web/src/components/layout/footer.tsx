import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const COLUMNS = [
  {
    title: "Platform",
    links: [
      { href: "/#live-map", label: "Live flood map" },
      { href: "/#how-it-works", label: "How it works" },
      { href: "/needs", label: "Needs" },
    ],
  },
  {
    title: "Get started",
    links: [
      { href: "/signup", label: "Request help" },
      { href: "/signup", label: "Become a responder" },
      { href: "/signin", label: "Sign in" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr]">
          <div className="space-y-3">
            <Logo />
            <p className="max-w-xs text-sm text-muted-foreground">
              Connecting people who need help with verified responders.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold">{col.title}</h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t pt-6 text-sm text-muted-foreground">
          <span>© 2026 Rahat. Built for good.</span>
        </div>
      </div>
    </footer>
  );
}