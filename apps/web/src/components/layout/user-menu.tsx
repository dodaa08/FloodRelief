"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ClipboardList, LayoutList, LogOut, Map, PlusCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { isResponder, useUser } from "@/lib/use-user";

function initials(name: string | null, phone: string): string {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("");
  }
  return phone.slice(-2);
}

const ROLE_LABEL: Record<string, string> = {
  CITIZEN: "Citizen",
  VOLUNTEER: "Volunteer",
  NGO_COORDINATOR: "Coordinator",
  ADMIN: "Admin",
};

export function UserMenu() {
  const { user, loading, signOut } = useUser();
  const router = useRouter();

  if (loading) {
    return <Skeleton className="h-9 w-9 rounded-full" />;
  }
  if (!user) return null;

  const responder = isResponder(user);
  const staff = user.role !== "CITIZEN";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" className="gap-2 pl-1.5" />
        }
      >
        <Avatar className="h-7 w-7">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {initials(user.name, user.phone)}
          </AvatarFallback>
        </Avatar>
        <span className="hidden max-w-28 truncate sm:inline">
          {user.name ?? user.phone}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{user.name ?? "You"}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {ROLE_LABEL[user.role]}
              {user.approvalStatus !== "APPROVED" && " · pending approval"}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
        </DropdownMenuGroup>
        <DropdownMenuItem render={<Link href="/needs" />}>
          <LayoutList className="h-4 w-4" />
          {responder ? "Responder feed" : "My needs"}
        </DropdownMenuItem>
        {staff && (
          <DropdownMenuItem render={<Link href="/tasks" />}>
            <ClipboardList className="h-4 w-4" />
            My tasks
          </DropdownMenuItem>
        )}
        {user.role === "ADMIN" && (
          <DropdownMenuItem render={<Link href="/admin" />}>
            <ShieldCheck className="h-4 w-4" />
            Approvals
          </DropdownMenuItem>
        )}
        <DropdownMenuItem render={<Link href="/needs/new" />}>
          <PlusCircle className="h-4 w-4" />
          Report a need
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/map" />}>
          <Map className="h-4 w-4" />
          Live map
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            signOut();
            toast.success("Signed out");
            router.push("/");
            router.refresh();
          }}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}