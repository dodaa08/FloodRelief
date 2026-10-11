"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  History,
  ImageIcon,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, getToken } from "@/lib/api";
import { isResponder, useUser } from "@/lib/use-user";
import {
  NEED_META,
  STATUS_META,
  auditLabel,
  requestPhotoUrl,
  timeAgo,
  type NeedAuditEntry,
  type RequestItem,
} from "@/lib/requests";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type BriefResponse = { request: RequestItem; audit?: NeedAuditEntry[] };

const VERIFIED_STATUSES = new Set(["VERIFIED", "CLAIMED", "IN_PROGRESS", "FULFILLED"]);

export function NeedBrief({ id }: { id: string }) {
  const { user, loading: userLoading } = useUser();
  const [request, setRequest] = useState<RequestItem | null>(null);
  const [audit, setAudit] = useState<NeedAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [claiming, setClaiming] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [outcome, setOutcome] = useState("VERIFIED");
  const [method, setMethod] = useState("PHONE_CALL");
  const [notes, setNotes] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    let active = true;
    // Public brief first (works signed out); owners/responders fall back to
    // the authenticated endpoint for unverified requests.
    api<BriefResponse>(`/requests/public/${id}`)
      .catch((err: unknown) => {
        if (!active) throw err;
        if (err instanceof ApiError && (err.status === 404 || err.status === 403) && getToken()) {
          return api<BriefResponse>(`/requests/${id}`);
        }
        throw err;
      })
      .then((res) => {
        if (active) {
          setRequest(res.request);
          setAudit(res.audit ?? []);
          setError(undefined);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof ApiError ? err.message : "Could not load this need.");
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, refreshKey]);

  async function claim() {
    setClaiming(true);
    try {
      await api(`/requests/${id}/claim`, { method: "POST" });
      toast.success("Request claimed — it's now yours");
      setLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not claim request");
    } finally {
      setClaiming(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    try {
      await api(`/requests/${id}/verify`, {
        method: "POST",
        body: JSON.stringify({ outcome, method, notes: notes || undefined }),
      });
      toast.success(
        outcome === "VERIFIED" ? "Need verified — it's now live" : "Decision recorded",
      );
      setLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not record verification");
    } finally {
      setVerifying(false);
    }
  }

  if (loading || userLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="space-y-4">
        <Link
          href="/needs"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All needs
        </Link>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Couldn&apos;t open this need</AlertTitle>
          <AlertDescription>
            {error ?? "It may have been removed."}{" "}
            {!getToken() && "Unverified needs are only visible after signing in."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const meta = NEED_META[request.needType];
  const status = STATUS_META[request.status];
  const Icon = meta.icon;
  const verified = VERIFIED_STATUSES.has(request.status);
  const latestVerification = request.verifications?.[0];
  const canClaim = !!user && isResponder(user) && request.status === "VERIFIED";
  const canVerify =
    !!user &&
    user.approvalStatus === "APPROVED" &&
    (user.role === "NGO_COORDINATOR" || user.role === "ADMIN") &&
    ["SUBMITTED", "NEEDS_CHECK", "VERIFIED"].includes(request.status);

  return (
    <div className="space-y-4">
      <Link
        href="/needs"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All needs
      </Link>

      {/* Status banner — verified or not, up front */}
      <Card className={verified ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/60"}>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <span
              className={`grid h-11 w-11 place-items-center rounded-xl ${
                verified ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"
              }`}
            >
              {verified ? <ShieldCheck className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
            </span>
            <div>
              <p className="font-semibold">
                {verified ? "Verified need" : `${status.label} — awaiting verification`}
              </p>
              <p className="text-sm text-muted-foreground">
                {verified
                  ? "Confirmed genuine by a responder. Help can go ahead."
                  : "Reported by a citizen. A responder still needs to confirm it with photos."}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={status.badge}>
            {status.label}
          </Badge>
        </CardContent>
      </Card>

      {/* The brief */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <CardTitle>
                {meta.label} for {request.peopleCount}{" "}
                {request.peopleCount === 1 ? "person" : "people"}
              </CardTitle>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {timeAgo(request.createdAt)}
                {request.requesterName ? ` · by ${request.requesterName}` : ""}
                {request.reportedForSomeoneElse && request.reporterName
                  ? ` · for ${request.reporterName}`
                  : ""}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(request.locationText || request.district) && (
            <p className="flex items-start gap-1.5 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>
                {request.locationText}
                {request.district && (
                  <span className="text-muted-foreground">
                    {" "}
                    · {request.district.name}, {request.district.state}
                  </span>
                )}
              </span>
            </p>
          )}

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              What&apos;s needed
            </p>
            <p className="mt-1 text-sm leading-relaxed">
              {request.details ?? "No description provided."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {request.peopleCount} {request.peopleCount === 1 ? "person" : "people"}
            </span>
            {request.contactPhone && (
              <a
                href={`tel:${request.contactPhone}`}
                className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
              >
                <Phone className="h-4 w-4" />
                {request.contactPhone}
              </a>
            )}
          </div>

          {canClaim && (
            <Button onClick={claim} disabled={claiming} className="w-full sm:w-auto">
              {claiming ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Claiming…
                </>
              ) : (
                "Claim this request"
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Photos + files */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="h-4 w-4" />
            Photos {typeof request.photosCount === "number" && `(${request.photosCount})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {request.photos && request.photos.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {request.photos.map((p) => (
                <a
                  key={p.id}
                  href={requestPhotoUrl(p)}
                  target="_blank"
                  rel="noreferrer"
                  className="overflow-hidden rounded-lg border"
                  aria-label="Open full photo"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={requestPhotoUrl(p)}
                    alt={`Photo for this ${meta.label.toLowerCase()} request`}
                    loading="lazy"
                    className="aspect-square w-full object-cover transition-transform hover:scale-[1.02]"
                  />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No photos yet — verification requires at least one.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Verification record */}
      {latestVerification && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" />
              Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="font-medium capitalize">
                {latestVerification.outcome.toLowerCase().replace("_", " ")}
              </span>{" "}
              <span className="text-muted-foreground">
                · {latestVerification.method.toLowerCase().replace("_", " ")} ·{" "}
                {timeAgo(latestVerification.createdAt)}
              </span>
            </p>
            {latestVerification.notes && (
              <p className="text-muted-foreground">{latestVerification.notes}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Verify this need — coordinators decide after calling + checking photos */}
      {canVerify && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base">Verify this need</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={verify} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="outcome">Decision</Label>
                  <Select value={outcome} onValueChange={(v) => setOutcome(v ?? "VERIFIED")}>
                    <SelectTrigger id="outcome" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VERIFIED">Verified — genuine</SelectItem>
                      <SelectItem value="NOT_GENUINE">Not genuine</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="method">How did you check?</Label>
                  <Select value={method} onValueChange={(v) => setMethod(v ?? "PHONE_CALL")}>
                    <SelectTrigger id="method" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PHONE_CALL">Called the number</SelectItem>
                      <SelectItem value="FIELD_VISIT">Visited in person</SelectItem>
                      <SelectItem value="OFFICIAL">Official source</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  rows={2}
                  placeholder="What did you confirm?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={verifying}>
                {verifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Recording…
                  </>
                ) : (
                  "Record decision"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Activity log */}
      {audit.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" />
              Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {audit.map((e) => (
                <li key={e.id} className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary/60" />
                  <div>
                    <p className="font-medium">{auditLabel(e.action)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(e.createdAt).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}