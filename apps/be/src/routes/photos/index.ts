import { Router } from "express";
import { mkdir, stat, unlink } from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import {
  contentTypeForKey,
  MAX_PHOTO_BYTES,
  resolveUploadPath,
  verifyLocalUploadToken,
} from "../../services/storage.js";

const router = Router();

// Raw-body PUT, protected by the HMAC token handed out at presign time, so the
// upload URL is never publicly writable. Kept outside the /requests router
// because it isn't about a specific request yet.
router.put("/upload", async (req, res) => {
  try {
    const key = req.headers["x-storage-key"];
    const token = req.headers["x-storage-token"];
    if (typeof key !== "string" || typeof token !== "string") {
      return res.status(400).json({ error: "x-storage-key and x-storage-token headers required" });
    }
    if (!verifyLocalUploadToken(key, token)) {
      return res.status(401).json({ error: "Invalid upload token" });
    }

    const dest = resolveUploadPath(key);
    await mkdir(path.dirname(dest), { recursive: true });

    await pipeline(req, createWriteStream(dest));

    const info = await stat(dest);
    if (info.size > MAX_PHOTO_BYTES) {
      await unlink(dest).catch(() => undefined);
      return res.status(413).json({ error: "Photo exceeds 5 MB limit" });
    }

    return res.status(200).json({ ok: true, storageKey: key, bytes: info.size });
  } catch (error) {
    console.error(error);
    const key = req.headers["x-storage-key"];
    if (typeof key === "string") {
      try {
        const dest = resolveUploadPath(key);
        await stat(dest).then(() => unlink(dest));
      } catch {
        /* nothing to clean up */
      }
    }
    if (!res.headersSent) {
      return res.status(400).json({ error: "Upload failed" });
    }
  }
});

// Files are public by key (used as an <img> src). The key itself is an
// unguessable request-scoped UUID, so this is effectively private.
router.get("/file/:key", async (req, res) => {
  try {
    let key = req.params.key as string | string[] | undefined;
    key = typeof key === "string" ? key : undefined;
    if (!key) return res.status(404).json({ error: "Not found" });

    const filePath = resolveUploadPath(decodeURIComponent(key));
    let info;
    try {
      info = await stat(filePath);
    } catch {
      return res.status(404).json({ error: "Not found" });
    }

    res.setHeader("Content-Type", contentTypeForKey(key));
    res.setHeader("Content-Length", info.size);
    res.setHeader("Cache-Control", "public, max-age=86400");
    createReadStream(filePath).on("error", () => res.destroy()).pipe(res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.status(404).json({ error: "Not found" });
  }
});

export default router;