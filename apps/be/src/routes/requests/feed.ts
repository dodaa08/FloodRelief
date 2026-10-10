import { Router } from "express";
import { prisma, type RequestStatus } from "@repo/db";
import { feedQuerySchema } from "@repo/common/types";
import { requireRole } from "../../middleware/auth.js";
import { isApprovedResponder } from "../../lib/responder.js";
import { publicRequest } from "./public-request.js";

const router = Router();

const RESOLVED_STATUSES: RequestStatus[] = ["REJECTED", "NOT_GENUINE", "FULFILLED"];

// The responder feed: every open request, most urgent first. Approved
// responders see contact details so they can actually act.
router.get("/", requireRole("VOLUNTEER", "NGO_COORDINATOR", "ADMIN"), async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!isApprovedResponder(user)) {
      return res.status(403).json({ error: "Responder account is not approved" });
    }

    const parsed = feedQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    const { limit, status, needType } = parsed.data;

    const requests = await prisma.request.findMany({
      where: {
        status: status ?? { notIn: RESOLVED_STATUSES },
        needType,
      },
      include: {
        _count: { select: { photos: true } },
        requester: { select: { name: true } },
      },
      orderBy: [{ priorityScore: "desc" }, { createdAt: "asc" }],
      take: limit,
    });

    return res.status(200).json({
      requests: requests.map((request) => ({
        ...publicRequest(request, { viewerId: user.id, includeContact: true }),
        photosCount: request._count.photos,
        requesterName: request.requester?.name ?? null,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;