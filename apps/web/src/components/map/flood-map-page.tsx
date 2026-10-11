"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AlertTriangle, Megaphone, RefreshCw, Search } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import {
  RISK_META,
  RISK_ORDER,
  signalLabel,
  type FloodDistrict,
  type FloodOverview,
  type FloodRisk,
} from "@/lib/flood";
import {
  NEED_META,
  STATUS_META,
  timeAgo,
  type RequestItem,
} from "@/lib/requests";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import type { NeedPin } from "./district-map";

const DistrictMap = dynamic(() => import("./district-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full min-h-[420px] w-full rounded-xl" />,
});

type RiskFilter = FloodRisk | "ALL";

export function FloodMapPage() {
  const [data, setData] = useState<FloodOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [filter, setFilter] = useState<RiskFilter>("ALL");
  const [query, setQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [needs, setNeeds] = useState<RequestItem[]>([]);
  const [needsLoading, setNeedsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api<FloodOverview>("/flood/overview")
      .then((res) => {
        if (active) {
          setData(res);
          setError(undefined);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof ApiError
            ? `${err.message} — the live weather source may be busy.`
            : "Could not load the flood overview.",
        );
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [refreshKey]);

  // Verified needs reported by citizens — independent of the flood feed so a
  // slow requests query never blocks the map.
  useEffect(() => {
    let active = true;
    api<{ requests: RequestItem[] }>("/requests/public?limit=20")
      .then((res) => active && setNeeds(res.requests))
      .catch(() => active && setNeeds([]))
      .finally(() => active && setNeedsLoading(false));
    return () => {
      active = false;
    };
  }, [refreshKey]);

  function refresh() {
    setLoading(true);
    setError(undefined);
    setRefreshKey((k) => k + 1);
  }

  const districts = useMemo(() => data?.districts ?? [], [data]);

  // Verified needs pinned at their district's coordinates (joined by the DB
  // district id the overview already carries). Needs without a district stay
  // list-only.
  const needPins = useMemo<NeedPin[]>(() => {
    const byId = new Map(districts.map((d) => [d.districtId, d]));
    return needs.flatMap((n) => {
      const d = n.districtId ? byId.get(n.districtId) : undefined;
      if (!d) return [];
      return [
        {
          id: n.id,
          label: `${NEED_META[n.needType].label} · ${n.peopleCount} ${n.peopleCount === 1 ? "person" : "people"}`,
          sub: n.locationText ?? `${d.name}, ${d.state}`,
          lat: d.lat,
          lng: d.lng,
        },
      ];
    });
  }, [needs, districts]);

  const counts = useMemo(() => {
    const base: Record<FloodRisk, number> = { NORMAL: 0, WATCH: 0, WARNING: 0, FLOODED: 0 };
    for (const d of districts) base[d.risk] += 1;
    return base;
  }, [districts]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...districts]
      .filter((d) => filter === "ALL" || d.risk === filter)
      .filter(
        (d) =>
          !q ||
          d.name.toLowerCase().includes(q) ||
          d.state.toLowerCase().includes(q),
      )
      .sort(
        (a, b) =>
          RISK_ORDER.indexOf(a.risk) - RISK_ORDER.indexOf(b.risk) ||
          a.name.localeCompare(b.name),
      );
  }, [districts, filter, query]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Live flood map</h1>
          <p className="mt-1 text-muted-foreground">
            Real-time risk for every monitored district, from rainfall and river
            signals.
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Live data unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Risk summary */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {RISK_ORDER.map((risk) => {
          const meta = RISK_META[risk];
          return (
            <button
              key={risk}
              onClick={() => setFilter(filter === risk ? "ALL" : risk)}
              className={`rounded-xl border p-4 text-left transition-all hover:shadow-sm ${
                filter === risk ? "ring-2 ring-ring" : ""
              }`}
            >
              {loading ? (
                <Skeleton className="h-9 w-12" />
              ) : (
                <p className="text-2xl font-semibold">{counts[risk]}</p>
              )}
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                {meta.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Map, full width */}
      <Card className="mt-6 overflow-hidden">
        <CardContent className="p-2">
          {loading ? (
            <Skeleton className="h-full min-h-[420px] w-full rounded-xl" />
          ) : (
            <div className="h-[420px] overflow-hidden rounded-xl">
              <DistrictMap districts={districts} needs={needPins} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Districts */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search district or state…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["ALL", ...RISK_ORDER] as RiskFilter[]).map((f) => (
            <Button
              key={f}
              size="xs"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
            >
              {f === "ALL" ? "All" : RISK_META[f].label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))
          : visible.map((d) => <DistrictRow key={d.districtId} district={d} />)}

        {!loading && visible.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
            No districts match this filter.
          </p>
        )}
      </div>

      {data && (
        <p className="mt-3 text-xs text-muted-foreground">
          Source: {data.source} · updated{" "}
          {new Date(data.fetchedAt).toLocaleString()}
        </p>
      )}

      {/* Reported needs — our own verified data, alongside the flood areas */}
      <div className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              <Megaphone className="h-5 w-5 text-primary" />
              Reported needs
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Verified needs reported by citizens. Select one for the full brief.
            </p>
          </div>
          <Button
            nativeButton={false}
            variant="outline"
            size="sm"
            render={<Link href="/needs" />}
          >
            View all
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {needsLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))
            : needs.map((n) => <NeedRow key={n.id} need={n} />)}

          {!needsLoading && needs.length === 0 && (
            <p className="col-span-full rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
              No verified needs right now. When citizens report and responders
              verify, they appear here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function NeedRow({ need: n }: { need: RequestItem }) {
  const meta = NEED_META[n.needType];
  const status = STATUS_META[n.status];
  const Icon = meta.icon;
  return (
    <Link
      href={`/needs/${n.id}`}
      className="rounded-xl border p-3.5 transition-all hover:shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">
              {meta.label}
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                {n.district ? `${n.district.name}, ${n.district.state}` : (n.locationText ?? "")}
              </span>
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {n.peopleCount} {n.peopleCount === 1 ? "person" : "people"} · {timeAgo(n.createdAt)}
              {typeof n.photosCount === "number" && n.photosCount > 0
                ? ` · ${n.photosCount} photo${n.photosCount === 1 ? "" : "s"}`
                : ""}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={`shrink-0 ${status.badge}`}>
          {status.label}
        </Badge>
      </div>
    </Link>
  );
}

function DistrictRow({ district: d }: { district: FloodDistrict }) {
  const meta = RISK_META[d.risk];
  return (
    <div className="rounded-xl border p-5 transition-colors hover:bg-muted/40">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">
            {d.name}
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              {d.state}
            </span>
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {d.signals.length ? d.signals.map(signalLabel).join(" · ") : "No active signals"}
          </p>
        </div>
        <Badge variant="outline" className={`gap-1.5 ${meta.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </Badge>
      </div>

      {(d.forecastRainMm !== null || d.riverCurrent !== null) && (
        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
          {d.forecastRainMm !== null && (
            <span>Rain {Math.round(d.forecastRainMm)} mm</span>
          )}
          {d.riverCurrent !== null && (
            <span>
              River {Math.round(d.riverCurrent)} m³/s
              {d.riverTrend ? ` (${d.riverTrend})` : ""}
            </span>
          )}
        </div>
      )}
    </div>
  );
}