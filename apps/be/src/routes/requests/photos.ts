import { Router } from "express";
import { prisma } from "@repo/db";
import { attachPhotoSchema, presignPhotoSchema } from "@repo/common/types";
import { requireRole } from "../../middleware/auth.js";
import {
  createPhotoDownloadUrl,
  createPhotoUpload,
  isPhotoKeyForRequest,
  isStorageConfigured,
} from "../../services/storage.js";

const router = Router();

// Express types route params as string | string[] | undefined once middleware
// is in the handler chain, so narrow before use.
function pathParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

// Photos hang off a request the caller owns. No request → 404, not owner → 403.
async function loadOwnedRequest(requestId: string, userId: string) {
  const request = await prisma.request.findUnique({ where: { id: requestId } });
  if (!request) return { kind: "not_found" as const };
  if (request.requesterId !== userId) return { kind: "forbidden" as const };
  return { kind: "ok" as const, request };
}

// Step 1: hand the client a bounded, signed permission to upload one file.
router.post("/:id/photos/presign", requireRole("CITIZEN"), async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!isStorageConfigured()) {
      return res.status(503).json({ error: "Photo storage is not configured" });
    }

    const requestId = pathParam(req.params.id);
    if (!requestId) {
      return res.status(404).json({ error: "Request not found" });
    }

    const parsed = presignPhotoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    const owned = await loadOwnedRequest(requestId, user.id);
    if (owned.kind === "not_found") return res.status(404).json({ error: "Request not found" });
    if (owned.kind === "forbidden") return res.status(403).json({ error: "Not your request" });

    const target = await createPhotoUpload(requestId, parsed.data.contentType);
    return res.status(201).json(target);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Step 3 (after the client uploads to S3): record the key on the request.
router.post("/:id/photos", requireRole("CITIZEN"), async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const requestId = pathParam(req.params.id);
    if (!requestId) {
      return res.status(404).json({ error: "Request not found" });
    }

    const parsed = attachPhotoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    const owned = await loadOwnedRequest(requestId, user.id);
    if (owned.kind === "not_found") return res.status(404).json({ error: "Request not found" });
    if (owned.kind === "forbidden") return res.status(403).json({ error: "Not your request" });

    // The key carries its request id, so one request can't claim another's file.
    if (!isPhotoKeyForRequest(parsed.data.storageKey, requestId)) {
      return res.status(400).json({ error: "storageKey does not belong to this request" });
    }

    const photo = await prisma.requestPhoto.create({
      data: { requestId, storageKey: parsed.data.storageKey },
    });

    return res.status(201).json({ photo });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/photos/:photoId/url", requireRole("CITIZEN"), async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!isStorageConfigured()) {
      return res.status(503).json({ error: "Photo storage is not configured" });
    }

    const requestId = pathParam(req.params.id);
    const photoId = pathParam(req.params.photoId);
    if (!requestId || !photoId) {
      return res.status(404).json({ error: "Photo not found" });
    }

    const owned = await loadOwnedRequest(requestId, user.id);
    if (owned.kind === "not_found") return res.status(404).json({ error: "Request not found" });
    if (owned.kind === "forbidden") return res.status(403).json({ error: "Not your request" });

    const photo = await prisma.requestPhoto.findFirst({
      where: { id: photoId, requestId },
    });
    if (!photo) {
      return res.status(404).json({ error: "Photo not found" });
    }

    const url = await createPhotoDownloadUrl(photo.storageKey);
    return res.status(200).json({ url });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
