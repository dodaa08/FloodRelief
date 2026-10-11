"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Map as MapIcon, Radio, Satellite } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const SIGNALS = [
  { label: "Satellite rainfall", detail: "Live + 14-day forecast (Open-Meteo)", icon: Satellite },
  { label: "River discharge", detail: "GloFAS: current, peak &amp; trend", icon: Radio },
  { label: "District briefings", detail: "Needs, camps, volunteers on the ground", icon: MapIcon },
];

export function LiveMapBand() {
  return (
    <section
      id="live-map"
      className="scroll-mt-20 bg-gradient-to-br from-primary via-blue-600 to-cyan-600 py-20 text-primary-foreground"
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="space-y-6"
          >
            <Badge
              className="gap-2 border border-white/30 bg-white/10 text-primary-foreground"
              variant="outline"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-300 opacity-70" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-300" />
              </span>
              Live flood overview
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              The map is the single source of truth
            </h2>
            <p className="max-w-lg text-lg leading-8 text-white/85">
              Every district gets a live risk status pulled from weather data
              and ground reports — and responders coordinate against that same
              map.
            </p>
            <ul className="space-y-4">
              {SIGNALS.map((s) => (
                <li key={s.label} className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/15">
                    <s.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-medium">{s.label}</p>
                    <p className="text-sm text-white/75">{s.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Button
              size="lg"
              variant="secondary"
              className="gap-2 bg-white text-primary hover:bg-white/90"
              nativeButton={false} render={<Link href="/map" />}
            >
              Open the live map <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="grid grid-cols-2 gap-4"
          >
            {[
              { value: "22", label: "districts tracked", sub: "live risk status" },
              { value: "6", label: "need types", sub: "food · water · rescue…" },
            ].map((tile) => (
              <div
                key={tile.label}
                className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur"
              >
                <p className="text-3xl font-semibold">{tile.value}</p>
                <p className="mt-1 font-medium">{tile.label}</p>
                <p className="mt-0.5 text-sm text-white/70">{tile.sub}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}