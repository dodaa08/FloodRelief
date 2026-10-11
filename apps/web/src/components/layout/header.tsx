"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/brand/logo";
import { UserMenu } from "@/components/layout/user-menu";
import { useUser } from "@/lib/use-user";

const NAV_LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#live-map", label: "Live map" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const { user, loading } = useUser();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {loading ? (
            <Skeleton className="h-9 w-24 rounded-lg" />
          ) : user ? (
            <UserMenu />
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={<Link href="/signin" />}
              >
                Sign in
              </Button>
              <Button
                size="sm"
                nativeButton={false}
                render={<Link href="/needs/new" />}
              >
                Report a need
              </Button>
            </>
          )}
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Menu"
              />
            }
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <Logo />
            <nav className="mt-8 flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="mt-8 flex flex-col gap-2">
              {user ? (
                <UserMenu />
              ) : (
                <>
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={<Link href="/signin" />}
                  >
                    Sign in
                  </Button>
                  <Button
                    nativeButton={false}
                    render={<Link href="/needs/new" />}
                  >
                    Report a need
                  </Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}