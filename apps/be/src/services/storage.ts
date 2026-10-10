import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const UPLOAD_EXPIRY_SECONDS = 5 * 60;
const DOWNLOAD_EXPIRY_SECONDS = 15 * 60;

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Photos are optional for local dev: without a bucket the endpoints answer
// 503 instead of throwing on startup.
export function isStorageConfigured(): boolean {
  return Boolean(process.env.S3_BUCKET);
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

// Keys are namespaced by request, which is what lets us prove a storageKey
// belongs to the request it is being attached to.
function photoKeyPrefix(requestId: string): string {
  return `requests/${requestId}/`;
}

export function isPhotoKeyForRequest(storageKey: string, requestId: string): boolean {
  return storageKey.startsWith(photoKeyPrefix(requestId));
}

export type PhotoUploadTarget = {
  uploadUrl: string;
  fields: Record<string, string>;
  storageKey: string;
};

// The signed policy pins content-type and caps size, so a client can't use
// the URL to upload a 2 GB video or an executable.
export async function createPhotoUpload(
  requestId: string,
  contentType: string,
): Promise<PhotoUploadTarget> {
  const extension = EXTENSION_BY_CONTENT_TYPE[contentType];
  if (!extension) throw new Error(`Unsupported content type: ${contentType}`);

  const storageKey = `${photoKeyPrefix(requestId)}${crypto.randomUUID()}.${extension}`;

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

  return { uploadUrl: url, fields, storageKey };
}

export async function createPhotoDownloadUrl(storageKey: string): Promise<string> {
  return getSignedUrl(
    s3(),
    new GetObjectCommand({ Bucket: bucketName(), Key: storageKey }),
    { expiresIn: DOWNLOAD_EXPIRY_SECONDS },
  );
}
