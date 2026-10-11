"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, LogIn, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useUser } from "@/lib/use-user";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type Responder = {
  id: string;
  phone: string;
  name: string | null;
  role: string;
  approvalStatus: string;
  createdAt: string;
  responderType: string | null;
  skills: string[];
  organization: {
    id: string;
    name: string;
    email: string;
    website?: string | null;
    contactPhone?: string | null;
    registrationId?: string | null;
    approvalStatus?: string;
  } | null;
};

type Tab = "PENDING" | "APPROVED" | "REJECTED";

export function ApprovalsPage() {
  const { user, loading } = useUser();
  const [tab, setTab] = useState<Tab>("PENDING");
  const [rows, setRows] = useState<Responder[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [actingId, setActingId] = useState<string>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [adminPhone, setAdminPhone] = useState("");
  const [promoting, setPromoting] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "ADMIN") return;
    let active = true;
    api<{ responders: Responder[] }>(`/admin/responders?status=${tab}`)
      .then((res) => active && (setRows(res.responders), setError(undefined)))
      .catch((err) => active && setError(err instanceof ApiError ? err.message : "Could not load responders."))
      .finally(() => active && setListLoading(false));
    return () => {
      active = false;
    };
  }, [user, tab, refreshKey]);

  function switchTab(t: Tab) {
    setTab(t);
    setListLoading(true);
  }

  async function promote(e: React.FormEvent) {
    e.preventDefault();
    setPromoting(true);
    try {
      const res = await api<{ user: { phone: string } }>("/admin/users/make-admin", {
        method: "POST",
        body: JSON.stringify({ phone: adminPhone.replace(/\D/g, "") }),
      });
      toast.success(`+91 ${res.user.phone} is now an admin`);
      setAdminPhone("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not promote user");
    } finally {
      setPromoting(false);
    }
  }

  async function decide(id: string, action: "approve" | "reject") {
    setActingId(id);
    try {
      const res = await api<{ responder: { organizationApproved?: boolean } }>(
        `/admin/responders/${id}/${action}`,
        { method: "POST" },
      );
      toast.success(
        action === "approve"
          ? res.responder.organizationApproved
            ? "Responder + organization approved"
            : "Responder approved"
          : "Responder rejected",
      );
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not record decision");
    } finally {
      setActingId(undefined);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-10 sm:px-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
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
            <h2 className="text-lg font-semibold">Sign in as an admin</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Approvals are admin-only.
            </p>
            <Button nativeButton={false} render={<Link href="/signin" />}>
              Sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Admins only</AlertTitle>
          <AlertDescription>
            You&apos;re signed in as {user.role.toLowerCase().replace("_", " ")}. Ask an
            admin for access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Approvals</h1>
      <p className="mt-1 text-muted-foreground">
        Volunteers and coordinators can act only after approval.
      </p>

      <div className="mt-6 flex gap-1.5">
        {(["PENDING", "APPROVED", "REJECTED"] as Tab[]).map((t) => (
          <Button
            key={t}
            size="sm"
            variant={tab === t ? "default" : "outline"}
            onClick={() => switchTab(t)}
          >
            {t === "PENDING" ? "Pending" : t === "APPROVED" ? "Approved" : "Rejected"}
          </Button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Couldn&apos;t load responders</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : listLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))
        ) : rows.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No {tab.toLowerCase()} responders.
            </CardContent>
          </Card>
        ) : (
          rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {r.name ?? "Unnamed"}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      +91 {r.phone}
                    </span>
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">
                      {r.role === "NGO_COORDINATOR" ? "Coordinator" : "Volunteer"}
                    </Badge>
                    {r.organization && <span>{r.organization.name}</span>}
                    {r.skills.length > 0 && <span>{r.skills.join(", ")}</span>}
                    <span>joined {new Date(r.createdAt).toLocaleDateString()}</span>
                  </p>
                  {r.organization && (
                    <div className="mt-2 space-y-0.5 rounded-lg bg-muted/40 px-3 py-2 text-xs">
                      <p className="font-medium">
                        {r.organization.name}
                        {r.organization.approvalStatus && (
                          <span className="ml-1.5 font-normal text-muted-foreground">
                            · org {r.organization.approvalStatus.toLowerCase()}
                          </span>
                        )}
                      </p>
                      <p className="text-muted-foreground">{r.organization.email}</p>
                      <p className="flex flex-wrap gap-x-3 text-muted-foreground">
                        {r.organization.website && (
                          <a
                            href={`https://${r.organization.website.replace(/^https?:\/\//, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-primary hover:underline"
                          >
                            {r.organization.website}
                          </a>
                        )}
                        {r.organization.contactPhone && (
                          <span>+91 {r.organization.contactPhone}</span>
                        )}
                        {r.organization.registrationId && (
                          <span>Reg: {r.organization.registrationId}</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
                {tab === "PENDING" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="gap-1"
                      disabled={actingId === r.id}
                      onClick={() => decide(r.id, "approve")}
                    >
                      <Check className="h-4 w-4" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      disabled={actingId === r.id}
                      onClick={() => decide(r.id, "reject")}
                    >
                      <X className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card className="mt-8">
        <CardContent className="p-4">
          <p className="font-semibold">Promote an admin</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            The account must already exist — they sign up first, you promote here.
          </p>
          <form onSubmit={promote} className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              type="tel"
              inputMode="numeric"
              placeholder="10-digit mobile number"
              maxLength={10}
              required
              value={adminPhone}
              onChange={(e) => setAdminPhone(e.target.value.replace(/\D/g, ""))}
              className="sm:max-w-xs"
            />
            <Button type="submit" disabled={promoting} className="gap-1">
              <ShieldCheck className="h-4 w-4" />
              {promoting ? "Promoting…" : "Make admin"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}