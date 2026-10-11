import Link from "next/link";
import { ImageIcon, MapPin, Phone, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  NEED_META,
  STATUS_META,
  requestPhotoUrl,
  timeAgo,
  type RequestItem,
} from "@/lib/requests";

export function RequestCard({
  request,
  actions,
}: {
  request: RequestItem;
  actions?: React.ReactNode;
}) {
  const meta = NEED_META[request.needType];
  const status = STATUS_META[request.status];
  const Icon = meta.icon;
  const cover = request.photos?.[0];

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-sm">
      {cover && (
        <Link
          href={`/needs/${request.id}`}
          className="block"
          aria-label="Open the full brief for this need"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={requestPhotoUrl(cover)}
            alt={`Photo attached to this ${meta.label.toLowerCase()} request`}
            loading="lazy"
            className="h-40 w-full object-cover"
          />
        </Link>
      )}
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <Link
                href={`/needs/${request.id}`}
                className="font-semibold hover:underline"
              >
                {meta.label}
              </Link>
              <p className="text-xs text-muted-foreground">
                {timeAgo(request.createdAt)}
                {request.requesterName ? ` · by ${request.requesterName}` : ""}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={status.badge}>
            {status.label}
          </Badge>
        </div>

        {request.locationText && (
          <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {request.locationText}
          </p>
        )}

        {request.details && (
          <p className="text-sm text-foreground/80">{request.details}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {request.peopleCount} {request.peopleCount === 1 ? "person" : "people"}
          </span>
          {typeof request.photosCount === "number" && request.photosCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <ImageIcon className="h-3.5 w-3.5" />
              {request.photosCount} photo{request.photosCount === 1 ? "" : "s"}
            </span>
          )}
          {request.contactPhone && (
            <a
              href={`tel:${request.contactPhone}`}
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              <Phone className="h-3.5 w-3.5" />
              {request.contactPhone}
            </a>
          )}
        </div>

        {actions && <div className="pt-1">{actions}</div>}
      </CardContent>
    </Card>
  );
}