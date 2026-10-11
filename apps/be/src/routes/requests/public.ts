import { Router } from "express";
import { z } from "zod";
import { prisma, type RequestStatus } from "@repo/db";
import { publicRequest } from "./public-request.js";

const router = Router();
const UUID = z.uuid();

// Needs shown on the public live map and in public briefs: verified and being
// acted on. contactPhone is never exposed here — publicRequest without a
// viewer strips it.
const MAP_STATUSES: RequestStatus[] = ["VERIFIED", "CLAIMED", "IN_PROGRESS"];

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// Public list of verified needs, newest first. Powers the "Reported needs"
// section of the live map.
router.get("/public", async (req, res) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    const requests = await prisma.request.findMany({
      where: { status: { in: MAP_STATUSES } },
      include: {
        _count: { select: { photos: true } },
        photos: { orderBy: { createdAt: "asc" }, take: 1 },
        district: { select: { name: true, state: true } },
        requester: { select: { name: true } },
        verifications: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: parsed.data.limit,
    });

    return res.status(200).json({
      requests: requests.map((request) => ({
        ...publicRequest(request),
        photosCount: request._count.photos,
        requesterName: request.requester?.name ?? null,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Public brief for one verified need: full description, all photos,
// verification record, and the activity timeline. Unverified requests 404
// here — owners and responders use the authenticated GET /requests/:id.
router.get("/public/:id", async (req, res) => {
  try {
    if (!UUID.safeParse(req.params.id).success) {
      return res.status(404).json({ error: "Request not found" });
    }

    const request = await prisma.request.findUnique({
      where: { id: req.params.id },
      include: {
        photos: { orderBy: { createdAt: "asc" } },
        district: { select: { name: true, state: true } },
        requester: { select: { name: true } },
        verifications: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!request || !MAP_STATUSES.includes(request.status)) {
      return res.status(404).json({ error: "Request not found" });
    }

    const audit = await prisma.auditLog.findMany({
      where: { entityType: "Request", entityId: request.id },
      select: { id: true, action: true, createdAt: true, metadata: true },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return res.status(200).json({
      request: {
        ...publicRequest(request),
        photosCount: request.photos.length,
        requesterName: request.requester?.name ?? null,
      },
      audit,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
