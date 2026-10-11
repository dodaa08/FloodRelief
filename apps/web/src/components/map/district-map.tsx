"use client";

import { useEffect, useRef } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { RISK_META, type FloodDistrict } from "@/lib/flood";

const INDIA_CENTER: [number, number] = [22.5, 79];
const INDIA_ZOOM = 4;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function popupHtml(d: FloodDistrict): string {
  const meta = RISK_META[d.risk];
  const lines = [
    `<p style="margin:0;font-size:13px;font-weight:600">${escapeHtml(
      d.name,
    )}, ${escapeHtml(d.state)}</p>`,
    `<p style="margin:2px 0 0;font-size:12px;font-weight:500;color:${meta.hex}">${meta.label}${
      d.isFloodProne ? " · flood-prone" : ""
    }</p>`,
  ];
  if (d.forecastRainMm !== null) {
    lines.push(
      `<p style="margin:4px 0 0;font-size:12px">Forecast rain: ${Math.round(
        d.forecastRainMm,
      )} mm</p>`,
    );
  }
  if (d.riverCurrent !== null) {
    lines.push(
      `<p style="margin:2px 0 0;font-size:12px">River: ${Math.round(
        d.riverCurrent,
      )} m³/s${d.riverTrend ? ` · ${escapeHtml(d.riverTrend)}` : ""}</p>`,
    );
  }
  return lines.join("");
}

export type NeedPin = {
  id: string;
  label: string;
  sub: string;
  lat: number;
  lng: number;
};

// Deterministic spread so several needs in one district don't stack exactly.
function jitter(seed: string): [number, number] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const a = (h % 1000) / 1000 - 0.5;
  const b = (((h / 1000) | 0) % 1000) / 1000 - 0.5;
  return [a * 0.14, b * 0.14];
}

function needPopupHtml(pin: NeedPin): string {
  return [
    `<p style="margin:0;font-size:13px;font-weight:600">${escapeHtml(pin.label)}</p>`,
    `<p style="margin:2px 0 6px;font-size:12px;color:#64748b">${escapeHtml(pin.sub)}</p>`,
    `<a href="/needs/${escapeHtml(pin.id)}" style="font-size:12px;font-weight:600;color:#0284c7">View brief →</a>`,
  ].join("");
}

export default function DistrictMap({
  districts,
  needs = [],
}: {
  districts: FloodDistrict[];
  needs?: NeedPin[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = L.map(container, {
      center: INDIA_CENTER,
      zoom: INDIA_ZOOM,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    for (const d of districts) {
      L.circleMarker([d.lat, d.lng], {
        radius: d.risk === "NORMAL" ? 7 : 10,
        color: "#ffffff",
        weight: 2,
        fillColor: RISK_META[d.risk].hex,
        fillOpacity: 0.9,
      })
        .bindPopup(popupHtml(d))
        .addTo(map);
    }

    for (const pin of needs) {
      const [dLat, dLng] = jitter(pin.id);
      L.circleMarker([pin.lat + dLat, pin.lng + dLng], {
        radius: 6,
        color: "#ffffff",
        weight: 2,
        fillColor: "#0284c7",
        fillOpacity: 1,
      })
        .bindPopup(needPopupHtml(pin))
        .addTo(map);
    }

    return () => {
      map.remove();
    };
  }, [districts, needs]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded-xl"
      style={{ background: "#e0f2fe" }}
    />
  );
}