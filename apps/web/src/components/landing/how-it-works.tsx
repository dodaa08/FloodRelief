"use client";

import { motion } from "motion/react";
import { Camera, HandHelping, Send, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const STEPS = [
  {
    step: "01",
    icon: Send,
    title: "Post a need",
    body: "Tell us what's needed — food, water, rescue, shelter — and where. Works even on a weak connection.",
  },
  {
    step: "02",
    icon: Camera,
    title: "Team verifies it",
    body: "An approved responder confirms the need with photos, so volunteers know help is genuinely required.",
  },
  {
    step: "03",
    icon: HandHelping,
    title: "Help gets assigned",
    body: "Nearby NGOs and volunteers pick up the request. Track it until it's marked fulfilled.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-b bg-card/40 py-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            From cry for help to help delivered
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            A simple, transparent pipeline designed to work when the network is
            patchy and every minute counts.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.55, ease: "easeOut", delay: i * 0.12 }}
            >
              <Card className="h-full">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                      <step.icon className="h-5 w-5" />
                    </span>
                    <span className="text-3xl font-semibold text-muted/60">{step.step}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.body}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-10 flex max-w-xl items-center justify-center gap-2 rounded-full border bg-background px-5 py-2.5 text-sm text-muted-foreground"
        >
          <ShieldCheck className="h-4 w-4 text-primary" />
          Only approved volunteers &amp; NGOs can verify requests or see contact details.
        </motion.div>
      </div>
    </section>
  );
}