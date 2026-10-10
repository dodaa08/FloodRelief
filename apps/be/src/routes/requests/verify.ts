import { Router } from "express";
import { z } from "zod";
import { prisma, type RequestStatus } from "@repo/db";
import { verifyRequestSchema } from "@repo/common/types";
import { requireRole } from "../../middleware/auth.js";
import { isApprovedResponder } from "../../lib/responder.js";
import { publicRequest } from "./public-request.js";

const router = Router();
const UUID = z.uuid();

const STATUS_BY_OUTCOME: Record<string, RequestStatus> = {
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
  NOT_GENUINE: "NOT_GENUINE",
};

const RESOLVED_STATUSES: RequestStatus[] = ["REJECTED", "NOT_GENUINE", "FULFILLED"];

// Verifying is a trusted action: responders only, and only once approved.
router.post("/:id/verify", requireRole("VOLUNTEER", "NGO_COORDINATOR", "ADMIN"), async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!isApprovedResponder(user)) {
      return res.status(403).json({ error: "Responder account is not approved" });
    }
    const requestId = req.params.id;
    if (typeof requestId !== "string" || !UUID.safeParse(requestId).success) {
      return res.status(404).json({ error: "Request not found" });
    }

    const parsed = verifyRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    const { outcome, method, notes } = parsed.data;

    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: { photos: true },
    });
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }
    if (RESOLVED_STATUSES.includes(request.status)) {
      return res.status(409).json({ error: "Request is already resolved" });
    }

    // The rule from option 2: a request cannot be called genuine without at
    // least one photo. Rejections don't need a photo.
    if (outcome === "VERIFIED" && request.photos.length === 0) {
      return res.status(400).json({
        error: "At least one photo is required before a request can be verified",
      });
    }

    await prisma.verification.create({
      data: {
        requestId: request.id,
        verifierId: user.id,
        outcome,
        method,
        notes,
      },
    });

    const updated = await prisma.request.update({
      where: { id: request.id },
      data: { status: STATUS_BY_OUTCOME[outcome] },
      include: { photos: true },
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: `request.${outcome.toLowerCase()}`,
        entityType: "Request",
        entityId: request.id,
        metadata: { method },
      },
    });

    return res.status(200).json({
      request: publicRequest(updated, { viewerId: user.id, includeContact: true }),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
