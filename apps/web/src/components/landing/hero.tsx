"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Map as MapIcon, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isResponder, useUser } from "@/lib/use-user";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

export function Hero() {
  const { user, loading } = useUser();
  const responder = isResponder(user);
  const citizen = !!user && !responder && user.role === "CITIZEN";

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-[-160px] top-40 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 pt-20 pb-24 text-center sm:px-6 md:pt-28">
        <motion.div {...fadeUp}>
          <Badge
            variant="secondary"
            className="gap-2 border border-primary/20 bg-primary/5 px-3 py-1.5 text-primary"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
            </span>
            Live flood monitoring · 22 districts
          </Badge>
        </motion.div>

        <motion.h1
          {...fadeUp}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.05 }}
          className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl"
        >
          Every need, found.{" "}
          <span className="bg-gradient-to-r from-primary to-cyan-600 bg-clip-text text-transparent">
            Every life, reached.
          </span>
        </motion.h1>

        <motion.p
          {...fadeUp}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          className="mx-auto mt-6 max-w-xl text-lg leading-8 text-muted-foreground"
        >
          Pukaar connects citizens facing disaster with verified volunteers and
          NGOs. Post a need, get it confirmed, and watch help arrive.
        </motion.p>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          {!loading && citizen && (
            <Button size="lg" className="gap-2" nativeButton={false} render={<Link href="/needs/new" />}>
              <Megaphone className="h-4 w-4" /> Report a need
            </Button>
          )}
          {!loading && responder && (
            <Button size="lg" className="gap-2" nativeButton={false} render={<Link href="/needs" />}>
              View needs <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {!loading && !user && (
            <Button size="lg" className="gap-2" nativeButton={false} render={<Link href="/signup" />}>
              Get help now <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          <Button size="lg" variant="outline" className="gap-2" nativeButton={false} render={<Link href="/map" />}>
            <MapIcon className="h-4 w-4" /> View live map
          </Button>
        </motion.div>
      </div>
    </section>
  );
}