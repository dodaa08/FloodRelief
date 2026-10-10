import { Router } from "express";
import { z } from "zod";
import { prisma, type RequestStatus } from "@repo/db";
import { assignRequestSchema } from "@repo/common/types";
import { requireRole } from "../../middleware/auth.js";
import { isApprovedResponder } from "../../lib/responder.js";
import { publicRequest } from "./public-request.js";

const router = Router();
const UUID = z.uuid();

const RESOLVED_STATUSES: RequestStatus[] = ["REJECTED", "NOT_GENUINE", "FULFILLED"];

function paramId(raw: string | string[] | undefined): string | undefined {
  return typeof raw === "string" ? raw : undefined;
}

// A responder picks up an open request themselves.
router.post("/:id/claim", requireRole("VOLUNTEER", "NGO_COORDINATOR", "ADMIN"), async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!isApprovedResponder(user)) {
      return res.status(403).json({ error: "Responder account is not approved" });
    }

    const requestId = paramId(req.params.id);
    if (!requestId || !UUID.safeParse(requestId).success) {
      return res.status(404).json({ error: "Request not found" });
    }

    const request = await prisma.request.findUnique({ where: { id: requestId } });
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }
    if (RESOLVED_STATUSES.includes(request.status)) {
      return res.status(409).json({ error: "Request is already resolved" });
    }

    const active = await prisma.assignment.findFirst({
      where: { requestId, status: "ACTIVE" },
    });
    if (active) {
      return res.status(409).json({ error: "Request is already claimed or assigned" });
    }

    const [assignment, updatedRequest] = await prisma.$transaction([
      prisma.assignment.create({
        data: { requestId, volunteerId: user.id, claimType: "SELF_CLAIMED" },
      }),
      prisma.request.update({ where: { id: requestId }, data: { status: "CLAIMED" } }),
    ]);

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "assignment.claimed",
        entityType: "Request",
        entityId: requestId,
        metadata: { assignmentId: assignment.id },
      },
    });

    return res.status(200).json({
      assignment,
      request: publicRequest(updatedRequest, { viewerId: user.id, includeContact: true }),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// A coordinator/admin assigns a specific approved responder to a request.
router.post(
  "/:id/assign",
  requireRole("NGO_COORDINATOR", "ADMIN"),
  async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      if (!isApprovedResponder(user)) {
        return res.status(403).json({ error: "Responder account is not approved" });
      }

      const parsed = assignRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues });
      }

      const requestId = paramId(req.params.id);
      if (!requestId || !UUID.safeParse(requestId).success) {
        return res.status(404).json({ error: "Request not found" });
      }

      const [request, volunteer] = await Promise.all([
        prisma.request.findUnique({ where: { id: requestId } }),
        prisma.user.findUnique({ where: { id: parsed.data.volunteerId } }),
      ]);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }
      if (RESOLVED_STATUSES.includes(request.status)) {
        return res.status(409).json({ error: "Request is already resolved" });
      }
      if (
        !volunteer ||
        !["VOLUNTEER", "NGO_COORDINATOR"].includes(volunteer.role) ||
        volunteer.approvalStatus !== "APPROVED"
      ) {
        return res.status(400).json({ error: "Volunteer is not an approved responder" });
      }

      const active = await prisma.assignment.findFirst({
        where: { requestId, status: "ACTIVE" },
      });
      if (active) {
        return res.status(409).json({ error: "Request is already claimed or assigned" });
      }

      const [assignment, updatedRequest] = await prisma.$transaction([
        prisma.assignment.create({
          data: {
            requestId,
            volunteerId: volunteer.id,
            assignedById: user.id,
            claimType: "ASSIGNED",
          },
        }),
        prisma.request.update({ where: { id: requestId }, data: { status: "CLAIMED" } }),
      ]);

      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: "assignment.assigned",
          entityType: "Request",
          entityId: requestId,
          metadata: { assignmentId: assignment.id, volunteerId: volunteer.id },
        },
      });

      return res.status(200).json({
        assignment,
        request: publicRequest(updatedRequest, { viewerId: user.id, includeContact: true }),
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;