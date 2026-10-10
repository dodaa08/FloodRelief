import { Router } from "express";
import { z } from "zod";
import { prisma } from "@repo/db";
import { isApprovedResponder } from "../../lib/responder.js";
import { publicRequest } from "./public-request.js";

const router = Router();
const UUID = z.uuid();

// The caller's own requests, newest first.
router.get("/mine", async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const requests = await prisma.request.findMany({
      where: { requesterId: user.id },
      include: { photos: true },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      requests: requests.map((request) => publicRequest(request, { viewerId: user.id })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Visible to the owner, or to an approved responder (who also sees contactPhone).
router.get("/:id", async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!UUID.safeParse(req.params.id).success) {
      return res.status(404).json({ error: "Request not found" });
    }

    const request = await prisma.request.findUnique({
      where: { id: req.params.id },
      include: { photos: true },
    });
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    const isOwner = request.requesterId === user.id;
    const responder = isApprovedResponder(user);
    if (!isOwner && !responder) {
      return res.status(403).json({ error: "You do not have access to this request" });
    }

    return res.status(200).json({
      request: publicRequest(request, {
        viewerId: user.id,
        includeContact: isOwner || responder,
      }),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
