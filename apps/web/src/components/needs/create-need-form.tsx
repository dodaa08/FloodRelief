"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, LogIn, X } from "lucide-react";
import { toast } from "sonner";
import { absoluteApiUrl, api, ApiError, getToken } from "@/lib/api";
import { useUser } from "@/lib/use-user";
import { NEED_META, NEED_TYPES, type NeedType } from "@/lib/requests";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DistrictOption = { id: string; name: string; state: string; openRequests: number };

type CreateResponse = { request: { id: string } };
type PresignResponse = {
  provider: string;
  uploadUrl: string;
  method: "POST" | "PUT";
  fields?: Record<string, string>;
  headers?: Record<string, string>;
  storageKey: string;
};

async function uploadPhoto(
  requestId: string,
  file: File,
): Promise<void> {
  const target = await api<PresignResponse>(`/requests/${requestId}/photos/presign`, {
    method: "POST",
    body: JSON.stringify({ contentType: file.type }),
  });

  if (target.provider === "s3") {
    // Presigned POST: every field first, the file last, no manual Content-Type.
    const form = new FormData();
    for (const [key, value] of Object.entries(target.fields ?? {})) {
      form.append(key, value);
    }
    form.append("file", file);
    const res = await fetch(target.uploadUrl, { method: "POST", body: form });
    if (!res.ok) throw new Error("Photo upload failed");
  } else {
    const uploadUrl = absoluteApiUrl(target.uploadUrl);
    const res = await fetch(uploadUrl, {
      method: target.method,
      headers: { ...(target.headers ?? {}), "Content-Type": file.type },
      body: file,
    });
    if (!res.ok) throw new Error("Photo upload failed");
  }

  await api(`/requests/${requestId}/photos`, {
    method: "POST",
    body: JSON.stringify({ storageKey: target.storageKey }),
  });
}

export function CreateNeedForm() {
  const { user, loading } = useUser();
  const router = useRouter();
  const clientIdRef = useRef<string | undefined>(undefined);

  const [needType, setNeedType] = useState<NeedType>("FOOD");
  const [locationText, setLocationText] = useState("");
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [details, setDetails] = useState("");
  const [peopleCount, setPeopleCount] = useState(1);
  const [contactPhone, setContactPhone] = useState("");
  const [forSomeoneElse, setForSomeoneElse] = useState(false);
  const [reporterName, setReporterName] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    api<{ districts: DistrictOption[] }>("/districts")
      .then((res) => active && setDistricts(res.districts))
      .catch(() => active && setDistricts([]));
    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(undefined);
    try {
      const body = {
        clientId: clientIdRef.current ?? (clientIdRef.current = crypto.randomUUID()),
        needType,
        locationText,
        districtId: districtId ?? undefined,
        details: details || undefined,
        peopleCount,
        contactPhone: contactPhone || undefined,
        reportedForSomeoneElse: forSomeoneElse,
        reporterName: forSomeoneElse ? reporterName : undefined,
        reporterPhone: forSomeoneElse ? reporterPhone || undefined : undefined,
      };
      const { request } = await api<CreateResponse>("/requests", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (photo) {
        await uploadPhoto(request.id, photo);
      }

      toast.success("Need reported — we'll get it verified");
      router.push("/needs");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit the request");
    } finally {
      setSubmitting(false);
    }
  }

  if (!loading && !getToken()) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <LogIn className="h-6 w-6" />
          </span>
          <h2 className="text-lg font-semibold">Sign in to report a need</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Reporting uses your phone number so responders can reach you.
          </p>
          <Button nativeButton={false} render={<Link href="/signin" />}>
            Sign in
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!loading && user && user.role !== "CITIZEN") {
    return (
      <Alert>
        <AlertTitle>Only citizen accounts can report needs</AlertTitle>
        <AlertDescription>
          You&apos;re signed in as {user.role.toLowerCase().replace("_", " ")}. Reporting a
          need is for affected citizens — responders claim and fulfil them from the{" "}
          <Link href="/needs" className="font-medium text-primary hover:underline">
            responder feed
          </Link>
          .
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report a need</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Submission failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="needType">What&apos;s needed?</Label>
              <Select value={needType} onValueChange={(v) => setNeedType(v as NeedType)}>
                <SelectTrigger id="needType" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NEED_TYPES.map((t) => {
                    const Icon = NEED_META[t].icon;
                    return (
                      <SelectItem key={t} value={t}>
                        <Icon className="h-4 w-4" /> {NEED_META[t].label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="peopleCount">How many people?</Label>
              <Input
                id="peopleCount"
                type="number"
                min={1}
                max={10000}
                value={peopleCount}
                onChange={(e) => setPeopleCount(Math.max(1, Number(e.target.value) || 1))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="locationText">Location</Label>
            <Input
              id="locationText"
              placeholder="e.g. Near the old bridge, Ward 4"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              required
              minLength={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="district">District (pins it on the live map)</Label>
            <Select
              value={districtId ?? "none"}
              onValueChange={(v) => setDistrictId(v === "none" ? null : v)}
            >
              <SelectTrigger id="district" className="w-full">
                <SelectValue placeholder="Select a district…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No district — list only</SelectItem>
                {districts.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}, {d.state}
                    {d.openRequests > 0 ? ` · ${d.openRequests} open` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Details (optional)</Label>
            <Textarea
              id="details"
              placeholder="Anything responders should know — number of children, elderly, medical conditions…"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPhone">Contact number (optional)</Label>
            <Input
              id="contactPhone"
              type="tel"
              placeholder="Defaults to your sign-in number"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border p-3.5">
            <div>
              <p className="text-sm font-medium">Reporting for someone else</p>
              <p className="text-xs text-muted-foreground">
                Add the affected person&apos;s name and number.
              </p>
            </div>
            <Switch checked={forSomeoneElse} onCheckedChange={setForSomeoneElse} />
          </div>

          {forSomeoneElse && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reporterName">Their name</Label>
                <Input
                  id="reporterName"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reporterPhone">Their number</Label>
                <Input
                  id="reporterPhone"
                  type="tel"
                  value={reporterPhone}
                  onChange={(e) => setReporterPhone(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Photo (optional, helps verification)</Label>
            {photo ? (
              <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                <span className="inline-flex items-center gap-2 truncate">
                  <ImagePlus className="h-4 w-4 text-primary" />
                  {photo.name}
                </span>
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Remove photo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed py-6 text-sm text-muted-foreground hover:bg-muted/40">
                <ImagePlus className="h-5 w-5" />
                Tap to add a photo (JPEG, PNG or WebP, max 5 MB)
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
              </>
            ) : (
              "Submit request"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}