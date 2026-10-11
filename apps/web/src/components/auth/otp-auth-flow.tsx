"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Lock, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, setToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuthError } from "./auth-card";

type Mode = "signin" | "signup";
type Role = "CITIZEN" | "VOLUNTEER" | "NGO_COORDINATOR";

const PHONE_RE = /^[6-9]\d{9}$/;

const ROLE_HELP: Record<Exclude<Role, "CITIZEN">, string> = {
  VOLUNTEER: "Claim requests and help on the ground. Requires admin approval.",
  NGO_COORDINATOR: "Verify requests and assign your volunteer team. Requires admin approval.",
};

type OtpUser = {
  id: string;
  phone: string;
  name: string | null;
  role: string;
  approvalStatus: string;
};

export function OtpAuthFlow({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [stage, setStage] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("CITIZEN");
  const [orgName, setOrgName] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgWebsite, setOrgWebsite] = useState("");
  const [orgContactPhone, setOrgContactPhone] = useState("");
  const [orgRegistrationId, setOrgRegistrationId] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const signupRole = role !== "CITIZEN" ? role : undefined;
  const isCoordinator = signupRole === "NGO_COORDINATOR";

  async function sendCode(): Promise<boolean> {
    if (!PHONE_RE.test(phone)) {
      setError("Enter a valid 10-digit mobile number.");
      return false;
    }
    setError(undefined);
    setBusy(true);
    try {
      await api<{ message: string }>("/auth/otp/request", {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
      setStage("otp");
      toast.success(`One-time code sent to +91 ${phone}`);
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the code");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code we sent you.");
      return;
    }
    setError(undefined);
    setBusy(true);
    try {
      const body =
        mode === "signup" && signupRole
          ? {
              phone,
              code,
              name,
              role: signupRole,
              ...(isCoordinator
                ? {
                    orgName,
                    orgEmail,
                    orgWebsite: orgWebsite || undefined,
                    orgContactPhone: orgContactPhone || undefined,
                    orgRegistrationId: orgRegistrationId || undefined,
                  }
                : {}),
            }
          : { phone, code };
      const data = await api<{ token: string; user: OtpUser }>(
        "/auth/otp/verify",
        { method: "POST", body: JSON.stringify(body) },
      );
      setToken(data.token);
      if (data.user.approvalStatus !== "APPROVED") {
        toast.success("You're signed in — approval pending");
      } else if (mode === "signup") {
        toast.success("Welcome to Rahat 👋");
      } else {
        toast.success(`Welcome back, ${data.user.name ?? "friend"} 👋`);
      }
      router.push("/needs");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not verify the code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <AuthError message={error} />

      {stage === "phone" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendCode();
          }}
          className="space-y-4"
        >
          {mode === "signup" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="role">I’m joining as a</Label>
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as Role)}
                >
                  <SelectTrigger id="role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CITIZEN">Citizen — I need help / report needs</SelectItem>
                    <SelectItem value="VOLUNTEER">Volunteer — I want to help</SelectItem>
                    <SelectItem value="NGO_COORDINATOR">NGO coordinator — I run a response team</SelectItem>
                  </SelectContent>
                </Select>
                {signupRole && (
                  <p className="text-xs text-muted-foreground">
                    {ROLE_HELP[signupRole]}
                  </p>
                )}
              </div>

              {signupRole && (
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Asha Sharma"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              )}

              {isCoordinator && (
                <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
                  <p className="text-sm font-medium">
                    Your organization
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      An admin verifies this before you can act.
                    </span>
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="orgName">Organization name</Label>
                    <Input
                      id="orgName"
                      type="text"
                      placeholder="Rahat Volunteers"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orgEmail">Official email</Label>
                    <Input
                      id="orgEmail"
                      type="email"
                      placeholder="contact@rahatvolunteers.org"
                      autoComplete="email"
                      value={orgEmail}
                      onChange={(e) => setOrgEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="orgWebsite">Website (optional)</Label>
                      <Input
                        id="orgWebsite"
                        type="text"
                        inputMode="url"
                        placeholder="rahatvolunteers.org"
                        value={orgWebsite}
                        onChange={(e) => setOrgWebsite(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="orgContactPhone">Org phone (optional)</Label>
                      <Input
                        id="orgContactPhone"
                        type="tel"
                        inputMode="numeric"
                        placeholder="Defaults to your number"
                        maxLength={10}
                        value={orgContactPhone}
                        onChange={(e) => setOrgContactPhone(e.target.value.replace(/\D/g, ""))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orgRegistrationId">
                      Registration ID (optional)
                    </Label>
                    <Input
                      id="orgRegistrationId"
                      type="text"
                      placeholder="NGO Darpan / Trust / 80G number"
                      value={orgRegistrationId}
                      onChange={(e) => setOrgRegistrationId(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <div className="relative">
              <Smartphone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                className="pl-9"
                placeholder="98765 43210"
                inputMode="numeric"
                autoComplete="tel"
                required
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Sending code…
              </>
            ) : (
              <>
                Send one-time code <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            {mode === "signup"
              ? "We'll verify your phone before creating your account."
              : "New number? It creates your account automatically."}
          </p>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
            <span>
              Code sent to <span className="font-medium text-foreground">+91 {phone}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setStage("phone");
                setCode("");
                setError(undefined);
              }}
              className="text-xs font-medium text-primary hover:underline"
            >
              Change
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">One-time code</Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              required
              maxLength={6}
              className="text-center text-lg tracking-[0.5em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
              </>
            ) : mode === "signup" ? (
              "Create my account"
            ) : (
              "Sign in"
            )}
          </Button>

          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            Didn&apos;t get it?{" "}
            <button
              type="button"
              onClick={() => void sendCode()}
              disabled={busy}
              className="font-medium text-primary hover:underline disabled:opacity-50"
            >
              Resend code
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Demo mode: the code is printed in the backend server log.
          </p>
        </form>
      )}
    </div>
  );
}