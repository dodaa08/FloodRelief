import {
  Droplets,
  Footprints,
  HeartPulse,
  Home,
  LifeBuoy,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { absoluteApiUrl } from "./api";

export type NeedType =
  | "FOOD"
  | "WATER"
  | "MEDICAL"
  | "RESCUE"
  | "SHELTER"
  | "EVACUATION";

export type RequestStatus =
  | "SUBMITTED"
  | "NEEDS_CHECK"
  | "VERIFIED"
  | "CLAIMED"
  | "IN_PROGRESS"
  | "FULFILLED"
  | "NOT_GENUINE"
  | "REJECTED";

export type RequestPhoto = { id: string; storageKey: string; url?: string };

export type NeedVerification = {
  id: string;
  outcome: string;
  method: string;
  notes: string | null;
  createdAt: string;
};

export type NeedAuditEntry = {
  id: string;
  action: string;
  createdAt: string;
  metadata: unknown;
};

// Prefer the backend-provided `url` (works for local and S3). The fallback is
// the local file route — note the /api/v1 prefix, which absoluteApiUrl does
// not add on its own. Files are public-by-key, so a plain <img> needs no auth.
export function requestPhotoUrl(photo: RequestPhoto): string {
  if (photo.url) return absoluteApiUrl(photo.url);
  return absoluteApiUrl(`/api/v1/photos/file/${encodeURIComponent(photo.storageKey)}`);
}

export type RequestItem = {
  id: string;
  clientId: string;
  needType: NeedType;
  details: string | null;
  peopleCount: number;
  locationText: string | null;
  status: RequestStatus;
  contactPhone?: string;
  districtId?: string | null;
  reportedForSomeoneElse: boolean;
  reporterName: string | null;
  createdAt: string;
  photos?: RequestPhoto[];
  photosCount?: number;
  requesterName?: string | null;
  district?: { name: string; state: string } | null;
  verifications?: NeedVerification[];
};

export const NEED_TYPES: NeedType[] = [
  "FOOD",
  "WATER",
  "MEDICAL",
  "RESCUE",
  "SHELTER",
  "EVACUATION",
];

export const NEED_META: Record<NeedType, { label: string; icon: LucideIcon }> = {
  FOOD: { label: "Food", icon: Utensils },
  WATER: { label: "Water", icon: Droplets },
  MEDICAL: { label: "Medical", icon: HeartPulse },
  RESCUE: { label: "Rescue", icon: LifeBuoy },
  SHELTER: { label: "Shelter", icon: Home },
  EVACUATION: { label: "Evacuation", icon: Footprints },
};

export const STATUS_META: Record<RequestStatus, { label: string; badge: string }> = {
  SUBMITTED: { label: "Submitted", badge: "border-sky-200 bg-sky-50 text-sky-700" },
  NEEDS_CHECK: { label: "Needs check", badge: "border-amber-200 bg-amber-50 text-amber-700" },
  VERIFIED: { label: "Verified", badge: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  CLAIMED: { label: "Claimed", badge: "border-indigo-200 bg-indigo-50 text-indigo-700" },
  IN_PROGRESS: { label: "In progress", badge: "border-violet-200 bg-violet-50 text-violet-700" },
  FULFILLED: { label: "Fulfilled", badge: "border-emerald-300 bg-emerald-100 text-emerald-800" },
  NOT_GENUINE: { label: "Not genuine", badge: "border-zinc-200 bg-zinc-50 text-zinc-600" },
  REJECTED: { label: "Rejected", badge: "border-red-200 bg-red-50 text-red-700" },
};
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

// Human labels for the request activity timeline (backend audit actions).
export function auditLabel(action: string): string {
  switch (action) {
    case "request.created":
      return "Need reported";
    case "request.verified":
      return "Verified by a responder";
    case "request.not_genuine":
      return "Marked not genuine";
    case "request.rejected":
      return "Rejected";
    case "assignment.claimed":
      return "Claimed by a volunteer";
    case "assignment.assigned":
      return "Assigned to a volunteer";
    default:
      if (action.startsWith("assignment.completed")) return "Marked complete";
      if (action.startsWith("assignment.")) return "Assignment updated";
      return action;
  }
}