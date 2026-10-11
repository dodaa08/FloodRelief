"use client";

import { OtpAuthFlow } from "./otp-auth-flow";
import { AuthCard, AuthFooterLink } from "./auth-card";

export function SignupForm() {
  return (
    <AuthCard
      title="Create your account"
      description="Verify your phone with a one-time code — takes under a minute."
      footer={
        <>
          Already have an account? <AuthFooterLink to="/signin">Sign in</AuthFooterLink>
        </>
      }
    >
      <OtpAuthFlow mode="signup" />
    </AuthCard>
  );
}