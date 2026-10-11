import type { Request as RequestModel, RequestPhoto } from "@repo/db";
import { storageProvider } from "../../services/storage.js";

export type RequestWithPhotos = RequestModel & { photos?: RequestPhoto[] };

// Every photo the API returns carries a ready-to-render `url` so the frontend
// never has to know which storage backend is behind it. Local = the public
// /api/v1 file route; S3 = a public-read base URL (private buckets would need
// per-request signed URLs instead).
function photoPublicUrl(storageKey: string): string | undefined {
  if (storageProvider() === "local") {
    return `/api/v1/photos/file/${encodeURIComponent(storageKey)}`;
  }
  const base = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
  return base ? `${base}/${storageKey}` : undefined;
}

// contactPhone is the affected person's number. It is exposed to the request's
// owner and to approved responders; nobody else ever sees it.
export function publicRequest(
  request: RequestWithPhotos,
  options: { viewerId?: string; includeContact?: boolean } = {},
) {
  const { contactPhone, photos, ...rest } = request;
  const include = options.includeContact === true || request.requesterId === options.viewerId;
  return {
    ...rest,
    ...(photos
      ? { photos: photos.map((p) => ({ ...p, url: photoPublicUrl(p.storageKey) })) }
      : {}),
    contactPhone: include ? contactPhone : undefined,
  };
}
