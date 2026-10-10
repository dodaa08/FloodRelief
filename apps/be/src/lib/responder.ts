import type { User } from "@repo/db";

export const RESPONDER_ROLES: User["role"][] = ["VOLUNTEER", "NGO_COORDINATOR", "ADMIN"];

// Volunteers and coordinators sign up PENDING. Seeing request contact details
// or verifying a request requires approval, so an unreviewed signup can't
// act as a responder.
export function isApprovedResponder(user: User): boolean {
  return RESPONDER_ROLES.includes(user.role) && user.approvalStatus === "APPROVED";
}
