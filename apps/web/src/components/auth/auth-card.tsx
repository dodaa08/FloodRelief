import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

// Alert isn't in the installed set; use a plain bordered div instead.
export function AuthError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

type AuthCardProps = {
  title: string;
  description: string;
  footer: React.ReactNode;
  children: React.ReactNode;
};

export function AuthCard({ title, description, footer, children }: AuthCardProps) {
  return (
    <Card className="w-full max-w-md border shadow-xl shadow-primary/5">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
      <CardFooter className="justify-center border-t px-6 py-4 text-sm text-muted-foreground">
        {footer}
      </CardFooter>
    </Card>
  );
}

export function AuthFooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link href={to} className="font-semibold text-primary hover:underline">
      {children}
    </Link>
  );
}