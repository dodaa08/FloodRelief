// Bootstrap an admin: promotes an existing user by phone.
// Run: bun run make-admin 9876543210
import { prisma } from "@repo/db";

const phone = (process.argv[2] ?? "").trim();
if (!/^[6-9]\d{9}$/.test(phone)) {
  console.error("Usage: bun run make-admin <10-digit-phone>");
  process.exit(1);
}

const user = await prisma.user.findUnique({ where: { phone } });
if (!user) {
  console.error(`No user found with phone ${phone}. Create the user first (signup or OTP).`);
  process.exit(1);
}

const updated = await prisma.user.update({
  where: { id: user.id },
  data: { role: "ADMIN", approvalStatus: "APPROVED" },
});

console.log(`✔ ${updated.phone} is now ADMIN (approvalStatus=APPROVED)`);
await prisma.$disconnect();