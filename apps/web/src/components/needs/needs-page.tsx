"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, LogIn, Megaphone, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { isResponder, useUser } from "@/lib/use-user";
import type { RequestItem } from "@/lib/requests";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RequestCard } from "./request-card";

export function NeedsPage() {
  const { user, loading } = useUser();
  const responder = isResponder(user);
  const role = user?.role;
  // Volunteers only ever see verified work; coordinators review everything.
  const volunteerOnly = role === "VOLUNTEER";
  const coordinator = role === "NGO_COORDINATOR" || role === "ADMIN";

  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [claimingId, setClaimingId] = useState<string>();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const path = isResponder(user) ? "/requests?limit=50" : "/requests/mine";
    api<{ requests: RequestItem[] }>(path)
      .then((res) => {
        if (active) {
          const list = volunteerOnly
            ? res.requests.filter((r) =>
                ["VERIFIED", "CLAIMED", "IN_PROGRESS"].includes(r.status),
              )
            : res.requests;
          setRequests(list);
          setError(undefined);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof ApiError ? err.message : "Could not load requests.");
        }
      })
      .finally(() => active && setListLoading(false));
    return () => {
      active = false;
    };
  }, [user, refreshKey, volunteerOnly]);

  function refresh() {
    setListLoading(true);
    setRefreshKey((k) => k + 1);
  }

  async function claim(id: string) {
    setClaimingId(id);
    try {
      await api(`/requests/${id}/claim`, { method: "POST" });
      toast.success("Request claimed — it's now yours");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not claim request");
    } finally {
      setClaimingId(undefined);
    }
  }

  if (loading) {
    return (
      <Shell>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <EmptyState
          icon={<LogIn className="h-6 w-6" />}
          title="Sign in to see needs"
          body="Track your requests or claim work as a verified responder."
        >
          <Button nativeButton={false} render={<Link href="/signin" />}>
            Sign in
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/signup" />}
          >
            Create account
          </Button>
        </EmptyState>
      </Shell>
    );
  }

  const pending = user.approvalStatus !== "APPROVED";

  const copy = volunteerOnly
    ? {
        title: "Verified tasks",
        subtitle: "Confirmed needs you can claim and fulfil.",
        empty: "No verified tasks right now. Check back after coordinators verify new reports.",
      }
    : coordinator
      ? {
          title: "Review needs",
          subtitle: "Verify new reports, then claim or assign them.",
          empty: "Nothing to review. New citizen reports will appear here.",
        }
      : responder
        ? {
            title: "Responder feed",
            subtitle: "Open requests near you, highest priority first.",
            empty: "When citizens report needs, they'll appear here for you to claim.",
          }
        : {
            title: "Your needs",
            subtitle: "Requests you've reported and their current status.",
            empty: "When you report a need, you'll be able to track it here.",
          };

  return (
    <Shell
      title={copy.title}
      subtitle={copy.subtitle}
      action={
        responder ? (
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/tasks" />}
            className="gap-2"
          >
            My tasks
          </Button>
        ) : (
          <Button nativeButton={false} render={<Link href="/needs/new" />} className="gap-2">
            <PlusCircle className="h-4 w-4" /> Report a need
          </Button>
        )
      }
    >
      {pending ? (
        <EmptyState
          icon={<Clock className="h-6 w-6" />}
          title="Approval pending"
          body="Your responder account is waiting for admin approval. You'll be able to see and claim requests once approved."
        />
      ) : error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Couldn&apos;t load requests</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={refresh}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : listLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-6 w-6" />}
          title={responder ? "Nothing here" : "No requests yet"}
          body={copy.empty}
        >
          {!responder && (
            <Button nativeButton={false} render={<Link href="/needs/new" />}>
              Report a need
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {requests.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              actions={
                responder && r.status === "VERIFIED" ? (
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={claimingId === r.id}
                    onClick={() => claim(r.id)}
                  >
                    {claimingId === r.id ? "Claiming…" : "Claim this request"}
                  </Button>
                ) : coordinator &&
                  (r.status === "SUBMITTED" || r.status === "NEEDS_CHECK") ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    nativeButton={false}
                    render={<Link href={`/needs/${r.id}`} />}
                  >
                    Review &amp; verify
                  </Button>
                ) : undefined
              }
            />
          ))}
        </div>
      )}
    </Shell>
  );
}

function Shell({
  title,
  subtitle,
  action,
  children,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      {title && (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          {icon}
        </span>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="max-w-md text-sm text-muted-foreground">{body}</p>
        {children && <div className="mt-2 flex gap-2">{children}</div>}
      </CardContent>
    </Card>
  );
}