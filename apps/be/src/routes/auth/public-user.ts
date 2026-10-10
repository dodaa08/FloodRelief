import type { User } from "@repo/db";

export function publicUser(user: User) {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    role: user.role,
    approvalStatus: user.approvalStatus,
    isBlocked: user.isBlocked,
    createdAt: user.createdAt,
  };
}
