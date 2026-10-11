import { Router } from "express";
import { z } from "zod";
import { prisma, type RequestStatus } from "@repo/db";
import { updateAssignmentSchema } from "@repo/common/types";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { isApprovedResponder } from "../../lib/responder.js";
import { publicRequest } from "../requests/public-request.js";

const router = Router();
const UUID = z.uuid();

router.use(requireAuth);

// The responder's own workload: claims and assignments, most recent first.
router.get("/mine", requireRole("VOLUNTEER", "NGO_COORDINATOR", "ADMIN"), async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!isApprovedResponder(user)) {
      return res.status(403).json({ error: "Responder account is not approved" });
    }

    const assignments = await prisma.assignment.findMany({
      where: { volunteerId: user.id },
      include: { request: true },
      orderBy: [{ status: "asc" }, { claimedAt: "desc" }],
      take: 50,
    });

    return res.status(200).json({
      assignments: assignments.map((assignment) => ({
        ...assignment,
        request: publicRequest(assignment.request, {
          viewerId: user.id,
          includeContact: true,
        }),
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Where an assignment can go once work has started. Releasing or failing a
// claim reopens the request (VERIFIED) so someone else can pick it up.
const REQUEST_STATUS_BY_ACTION: Record<string, RequestStatus> = {
  COMPLETED: "FULFILLED",
  FAILED: "VERIFIED",
  RELEASED: "VERIFIED",
};

router.patch("/:id", requireRole("VOLUNTEER", "NGO_COORDINATOR", "ADMIN"), async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!isApprovedResponder(user)) {
      return res.status(403).json({ error: "Responder account is not approved" });
    }

    const assignmentId = req.params.id;
    if (typeof assignmentId !== "string" || !UUID.safeParse(assignmentId).success) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    const parsed = updateAssignmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    const isVolunteer = assignment.volunteerId === user.id;
    const isAssigner = assignment.assignedById === user.id;
    const isAdmin = user.role === "ADMIN";
    if (!isVolunteer && !isAssigner && !isAdmin) {
      return res.status(403).json({ error: "Not your assignment" });
    }
    if (assignment.status !== "ACTIVE") {
      return res.status(409).json({ error: "Assignment is not ACTIVE" });
    }

    const { status, failureReason } = parsed.data;
    const assignmentData = (
      status === "COMPLETED"
        ? { status: "COMPLETED", completedAt: new Date(), failureReason: null }
        : status === "FAILED"
          ? { status: "FAILED", failureReason }
          : { status: "RELEASED" }
    ) satisfies {
      status: "COMPLETED" | "FAILED" | "RELEASED";
      completedAt?: Date;
      failureReason?: string | null;
    };

    const [updatedAssignment, updatedRequest] = await prisma.$transaction([
      prisma.assignment.update({ where: { id: assignmentId }, data: assignmentData }),
      prisma.request.update({
        where: { id: assignment.requestId },
        data: { status: REQUEST_STATUS_BY_ACTION[status] },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: `assignment.${status.toLowerCase()}_${isVolunteer ? "by_volunteer" : "by_assigner"}`,
        entityType: "Assignment",
        entityId: assignmentId,
        metadata: { requestId: assignment.requestId, failureReason },
      },
    });

    return res.status(200).json({
      assignment: updatedAssignment,
      request: publicRequest(updatedRequest, { viewerId: user.id, includeContact: true }),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;