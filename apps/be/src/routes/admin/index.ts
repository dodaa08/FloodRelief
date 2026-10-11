import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "@repo/db";
import { phoneSchema } from "@repo/common/types";
import { requireAuth, requireRole } from "../../middleware/auth.js";

const router = Router();
const UUID = z.uuid();

// Everything here is admin-only.
router.use(requireAuth, requireRole("ADMIN"));

// Responders (volunteers / coordinators) await admin approval before they can
// see request contact details, verify, or claim work.
router.get("/responders", async (req, res) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : "PENDING";
    if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ error: "status must be PENDING, APPROVED or REJECTED" });
    }

    const responders = await prisma.user.findMany({
      where: {
        role: { in: ["VOLUNTEER", "NGO_COORDINATOR"] },
        approvalStatus: status as "PENDING" | "APPROVED" | "REJECTED",
      },
      include: {
        volunteerProfile: true,
        organization: true,
      },
      orderBy: [{ createdAt: "asc" }],
    });

    return res.status(200).json({
      responders: responders.map((u) => ({
        id: u.id,
        phone: u.phone,
        name: u.name,
        role: u.role,
        approvalStatus: u.approvalStatus,
        createdAt: u.createdAt,
        responderType: u.volunteerProfile?.responderType ?? null,
        skills: u.volunteerProfile?.skills ?? [],
        organization: u.organization
          ? {
              id: u.organization.id,
              name: u.organization.name,
              email: u.organization.email,
              website: u.organization.website,
              contactPhone: u.organization.contactPhone,
              registrationId: u.organization.registrationId,
              approvalStatus: u.organization.approvalStatus,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

async function setApproval(
  req: Request,
  res: Response,
  status: "APPROVED" | "REJECTED",
) {
  try {
    const userId = req.params.id;
    if (typeof userId !== "string" || !UUID.safeParse(userId).success) {
      return res.status(404).json({ error: "Responder not found" });
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });
    if (!target || !["VOLUNTEER", "NGO_COORDINATOR"].includes(target.role)) {
      return res.status(404).json({ error: "Responder not found" });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { approvalStatus: status },
    });

    // Approving a coordinator vouches for their organization too — but only
    // forward (PENDING → APPROVED). A later rejection never demotes an org
    // other members already validated.
    let orgApproved = false;
    if (
      status === "APPROVED" &&
      target.organizationId &&
      target.organization?.approvalStatus === "PENDING"
    ) {
      await prisma.organization.update({
        where: { id: target.organizationId },
        data: { approvalStatus: "APPROVED" },
      });
      orgApproved = true;
    }

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: status === "APPROVED" ? "responder.approved" : "responder.rejected",
        entityType: "User",
        entityId: userId,
        metadata: { role: target.role },
      },
    });

    return res.status(200).json({
      responder: {
        id: updated.id,
        phone: updated.phone,
        role: updated.role,
        approvalStatus: updated.approvalStatus,
        organizationApproved: orgApproved,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

router.post("/responders/:id/approve", (req, res) => setApproval(req, res, "APPROVED"));

router.post("/responders/:id/reject", (req, res) => setApproval(req, res, "REJECTED"));

// Promote any existing user to admin by phone (the UI twin of the
// make-admin script — the very first admin still needs the script).
router.post("/users/make-admin", async (req, res) => {
  try {
    const parsed = z.object({ phone: phoneSchema }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    const target = await prisma.user.findUnique({ where: { phone: parsed.data.phone } });
    if (!target) {
      return res.status(404).json({ error: "No user found with that phone" });
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { role: "ADMIN", approvalStatus: "APPROVED" },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: "user.promoted_admin",
        entityType: "User",
        entityId: target.id,
        metadata: { previousRole: target.role },
      },
    });

    return res.status(200).json({
      user: {
        id: updated.id,
        phone: updated.phone,
        role: updated.role,
        approvalStatus: updated.approvalStatus,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Smoke check that role-gating works.
router.get("/ping", (req, res) => {
  return res.status(200).json({ message: `hello ${req.user!.role}`, userId: req.user!.id });
});

export default router;