import { Router } from "express";
import { prisma } from "@repo/db";
import { createRequestSchema } from "@repo/common/types";
import { requireRole } from "../../middleware/auth.js";
import { publicRequest } from "./public-request.js";

const router = Router();

router.post("/", requireRole("CITIZEN"), async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const parsed = createRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    const data = parsed.data;

    // Idempotent by clientId: an offline client retrying the same
    // submission gets the original request back, not a duplicate.
    const existing = await prisma.request.findUnique({ where: { clientId: data.clientId } });
    if (existing) {
      if (existing.requesterId !== user.id) {
        return res.status(409).json({ error: "clientId already used" });
      }
      return res.status(200).json({ request: publicRequest(existing, { viewerId: user.id }), duplicate: true });
    }

    const request = await prisma.request.create({
      data: {
        clientId: data.clientId,
        requesterId: user.id,
        needType: data.needType,
        details: data.details,
        peopleCount: data.peopleCount,
        locationText: data.locationText,
        contactPhone: data.contactPhone ?? user.phone,
        reportedForSomeoneElse: data.reportedForSomeoneElse,
        reporterName: data.reporterName,
        reporterPhone: data.reporterPhone,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "request.created",
        entityType: "Request",
        entityId: request.id,
        metadata: { needType: request.needType, channel: request.channel },
      },
    });

    return res.status(201).json({ request: publicRequest(request, { viewerId: user.id }) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
