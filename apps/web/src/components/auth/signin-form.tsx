"use client";

import { OtpAuthFlow } from "./otp-auth-flow";
import { AuthCard, AuthFooterLink } from "./auth-card";

export function SigninForm() {
  return (
    <AuthCard
      title="Welcome back"
      description="Sign in with a one-time code. Brand-new numbers get an account automatically."
      footer={
        <>
          New to Rahat? <AuthFooterLink to="/signup">Create an account</AuthFooterLink>
        </>
      }
    >
      <OtpAuthFlow mode="signin" />
    </AuthCard>
  );
}