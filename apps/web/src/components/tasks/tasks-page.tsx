"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ClipboardList, LogIn, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { isResponder, useUser } from "@/lib/use-user";
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
import { Skeleton } from "@/components/ui/skeleton";

type Assignment = {
  id: string;
  status: "ACTIVE" | "COMPLETED" | "FAILED" | "RELEASED";
  claimedAt: string;
  request: RequestItem;
};

export function TasksPage() {
  const { user, loading } = useUser();
  const [tasks, setTasks] = useState<Assignment[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [actingId, setActingId] = useState<string>();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user || !isResponder(user)) return;
    let active = true;
    api<{ assignments: Assignment[] }>("/assignments/mine")
      .then((res) => active && (setTasks(res.assignments), setError(undefined)))
      .catch((err) => active && setError(err instanceof ApiError ? err.message : "Could not load tasks."))
      .finally(() => active && setListLoading(false));
    return () => {
      active = false;
    };
  }, [user, refreshKey]);

  async function update(id: string, status: "COMPLETED" | "RELEASED") {
    setActingId(id);
    try {
      await api(`/assignments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success(
        status === "COMPLETED" ? "Marked complete — need fulfilled" : "Released — need is open again",
      );
      setListLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update task");
    } finally {
      setActingId(undefined);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-10 sm:px-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
              <LogIn className="h-6 w-6" />
            </span>
            <h2 className="text-lg font-semibold">Sign in to see your tasks</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Work you claim as a responder lands here.
            </p>
            <Button nativeButton={false} render={<Link href="/signin" />}>
              Sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isResponder(user)) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <Alert>
          <ClipboardList className="h-4 w-4" />
          <AlertTitle>Responders only</AlertTitle>
          <AlertDescription>
            Tasks are work claimed by volunteers and coordinators. Citizens track
            their reports under{" "}
            <Link href="/needs" className="font-medium text-primary hover:underline">
              Your needs
            </Link>
            .
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const active = tasks.filter((t) => t.status === "ACTIVE");
  const done = tasks.filter((t) => t.status !== "ACTIVE");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">My tasks</h1>
      <p className="mt-1 text-muted-foreground">
        Needs you claimed. Complete them when help is delivered.
      </p>

      {error ? (
        <Alert variant="destructive" className="mt-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Couldn&apos;t load tasks</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : listLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <Card className="mt-6 border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
              <ClipboardList className="h-6 w-6" />
            </span>
            <h2 className="text-lg font-semibold">No tasks yet</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Claim a verified need and it will show up here.
            </p>
            <Button nativeButton={false} render={<Link href="/needs" />}>
              Find work
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mt-6 space-y-3">
            {active.map((t) => (
              <TaskCard key={t.id} task={t} acting={actingId === t.id} onUpdate={update} />
            ))}
          </div>
          {done.length > 0 && (
            <>
              <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Past
              </h2>
              <div className="mt-3 space-y-3 opacity-80">
                {done.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function TaskCard({
  task: t,
  acting,
  onUpdate,
}: {
  task: Assignment;
  acting?: boolean;
  onUpdate?: (id: string, status: "COMPLETED" | "RELEASED") => void;
}) {
  const meta = NEED_META[t.request.needType];
  const status = STATUS_META[t.request.status];
  const Icon = meta.icon;
  const isActive = t.status === "ACTIVE";

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <Link
                href={`/needs/${t.request.id}`}
                className="font-semibold hover:underline"
              >
                {meta.label} · {t.request.peopleCount}{" "}
                {t.request.peopleCount === 1 ? "person" : "people"}
              </Link>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t.request.locationText ?? "No location"} · claimed {timeAgo(t.claimedAt)}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={status.badge}>
            {status.label}
          </Badge>
        </div>

        {t.request.contactPhone && (
          <a
            href={`tel:${t.request.contactPhone}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            Call {t.request.contactPhone}
          </a>
        )}

        {isActive && onUpdate && (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="gap-1"
              disabled={acting}
              onClick={() => onUpdate(t.id, "COMPLETED")}
            >
              <CheckCircle2 className="h-4 w-4" />
              {acting ? "Saving…" : "Mark complete"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              disabled={acting}
              onClick={() => onUpdate(t.id, "RELEASED")}
            >
              <Undo2 className="h-4 w-4" /> Release
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}