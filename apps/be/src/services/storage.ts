import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { createHmac, timingSafeEqual } from "node:crypto";
import path from "node:path";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const UPLOAD_EXPIRY_SECONDS = 5 * 60;
const DOWNLOAD_EXPIRY_SECONDS = 15 * 60;

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

// Keys are namespaced by request, which lets us prove a storageKey belongs to
// the request it is being attached to. This regex is also the path-traversal
// guard for the local provider.
const PHOTO_KEY_PATTERN = /^requests\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

export function isValidStorageKey(storageKey: string): boolean {
  return PHOTO_KEY_PATTERN.test(storageKey);
}

// Default is "local" so photos work with zero setup. Set STORAGE_PROVIDER=s3
// (plus S3_BUCKET / S3_ENDPOINT / keys) for real S3 or MinIO.
export function storageProvider(): "local" | "s3" {
  return (process.env.STORAGE_PROVIDER ?? "local") === "s3" ? "s3" : "local";
}

export function isStorageConfigured(): boolean {
  return storageProvider() === "local" ? true : Boolean(process.env.S3_BUCKET);
}

function bucketName(): string {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3_BUCKET is not set");
  return bucket;
}

let cachedClient: S3Client | undefined;

function s3(): S3Client {
  if (cachedClient) return cachedClient;
  cachedClient = new S3Client({
    region: process.env.AWS_REGION ?? "ap-south-1",
    // Set these to point at MinIO locally instead of real S3.
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.AWS_FORCE_PATH_STYLE === "true",
  });
  return cachedClient;
}

function photoKeyPrefix(requestId: string): string {
  return `requests/${requestId}/`;
}

export function isPhotoKeyForRequest(storageKey: string, requestId: string): boolean {
  return storageKey.startsWith(photoKeyPrefix(requestId));
}

export type PhotoUploadTarget = {
  provider: "local" | "s3";
  uploadUrl: string;
  // s3: presigned POST fields; local: raw PUT with these headers.
  method: "POST" | "PUT";
  fields?: Record<string, string>;
  headers?: Record<string, string>;
  storageKey: string;
};

// A 10-minute HMAC that proves the caller received a presign response for this
// exact key. Good enough for a demo; Tokens expire on the next restart.
function localUploadToken(storageKey: string): string {
  const secret = process.env.JWT_SECRET ?? "dev-local-secret";
  return createHmac("sha256", secret).update(`upload:${storageKey}`).digest("hex");
}

export function verifyLocalUploadToken(storageKey: string, token: string): boolean {
  const expected = localUploadToken(storageKey);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function resolveUploadPath(storageKey: string): string {
  if (!isValidStorageKey(storageKey)) throw new Error("Invalid storage key");
  const dir = path.resolve(process.env.UPLOAD_DIR || "uploads");
  const full = path.join(dir, storageKey);
  if (!full.startsWith(dir + path.sep)) throw new Error("Invalid storage key");
  return full;
}

export function contentTypeForKey(storageKey: string): string {
  const ext = path.extname(storageKey).replace(".", "");
  return CONTENT_TYPE_BY_EXTENSION[ext] ?? "application/octet-stream";
}

// Provider dispatch. The route code above the waterline doesn't care which
// storage backend is behind it.
export async function createPhotoUpload(
  requestId: string,
  contentType: string,
): Promise<PhotoUploadTarget> {
  const extension = EXTENSION_BY_CONTENT_TYPE[contentType];
  if (!extension) throw new Error(`Unsupported content type: ${contentType}`);

  const storageKey = `${photoKeyPrefix(requestId)}${crypto.randomUUID()}.${extension}`;

  if (storageProvider() === "local") {
    return {
      provider: "local",
      uploadUrl: "/api/v1/photos/upload",
      method: "PUT",
      headers: {
        "x-storage-key": storageKey,
        "x-storage-token": localUploadToken(storageKey),
      },
      storageKey,
    };
  }

  const { url, fields } = await createPresignedPost(s3(), {
    Bucket: bucketName(),
    Key: storageKey,
    Expires: UPLOAD_EXPIRY_SECONDS,
    Conditions: [
      ["eq", "$Content-Type", contentType],
      ["content-length-range", 1, MAX_PHOTO_BYTES],
    ],
    Fields: { "Content-Type": contentType },
  });

  return { provider: "s3", uploadUrl: url, method: "POST", fields, storageKey };
}

export async function createPhotoDownloadUrl(storageKey: string): Promise<string> {
  if (storageProvider() === "local") {
    return `/api/v1/photos/file/${encodeURIComponent(storageKey)}`;
  }
  return getSignedUrl(
    s3(),
    new GetObjectCommand({ Bucket: bucketName(), Key: storageKey }),
    { expiresIn: DOWNLOAD_EXPIRY_SECONDS },
  );
}