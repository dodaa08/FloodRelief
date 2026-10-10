import { z } from "zod";
import { phoneSchema } from "../auth/index.js";

// Mirrors the Prisma NeedType enum. Kept local so the frontend can import
// these types without pulling in the database client.
export const needTypeSchema = z.enum([
  "FOOD",
  "WATER",
  "MEDICAL",
  "RESCUE",
  "SHELTER",
  "EVACUATION",
]);

export const createRequestSchema = z
  .object({
    // Client-generated, so an offline app can retry the same submission
    // without creating duplicates.
    clientId: z.uuid("clientId must be a UUID"),
    needType: needTypeSchema,
    details: z.string().trim().max(2000).optional(),
    peopleCount: z.number().int().min(1, "At least 1 person").max(10000).default(1),
    // Text is the v1 location input ("near the old bridge, Ward 4").
    // Precise coordinates will be added separately.
    locationText: z.string().trim().min(3, "Describe the location").max(500),
    // Defaults to the logged-in user's own number.
    contactPhone: phoneSchema.optional(),
    reportedForSomeoneElse: z.boolean().default(false),
    reporterName: z.string().trim().max(100).optional(),
    reporterPhone: phoneSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.reportedForSomeoneElse && !value.reporterName) {
      ctx.addIssue({
        code: "custom",
        path: ["reporterName"],
        message: "Name is required when reporting for someone else",
      });
    }
  });

export const photoContentTypeSchema = z.enum(["image/jpeg", "image/png", "image/webp"]);

export const presignPhotoSchema = z.object({
  contentType: photoContentTypeSchema,
});

export const attachPhotoSchema = z.object({
  storageKey: z.string().trim().min(1).max(500),
});

export const verifyOutcomeSchema = z.enum(["VERIFIED", "REJECTED", "NOT_GENUINE"]);
export const verificationMethodSchema = z.enum([
  "PHONE_CALL",
  "FIELD_VISIT",
  "OFFICIAL",
  "OTHER",
]);

export const verifyRequestSchema = z.object({
  outcome: verifyOutcomeSchema,
  method: verificationMethodSchema.default("OTHER"),
  notes: z.string().trim().max(1000).optional(),
});

// Responder feed: open requests are all non-terminal statuses.
export const openRequestStatusSchema = z.enum([
  "SUBMITTED",
  "NEEDS_CHECK",
  "VERIFIED",
  "CLAIMED",
  "IN_PROGRESS",
]);

export const feedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: openRequestStatusSchema.optional(),
  needType: needTypeSchema.optional(),
});

export const assignRequestSchema = z.object({
  volunteerId: z.uuid("volunteerId must be a UUID"),
});

export const assignmentStatusUpdateSchema = z.enum(["COMPLETED", "FAILED", "RELEASED"]);

export const updateAssignmentSchema = z.object({
  status: assignmentStatusUpdateSchema,
  failureReason: z.string().trim().max(500).optional(),
});

export type NeedTypeInput = z.infer<typeof needTypeSchema>;
export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type PresignPhotoInput = z.infer<typeof presignPhotoSchema>;
export type AttachPhotoInput = z.infer<typeof attachPhotoSchema>;
export type VerifyRequestInput = z.infer<typeof verifyRequestSchema>;
export type FeedQueryInput = z.infer<typeof feedQuerySchema>;
export type AssignRequestInput = z.infer<typeof assignRequestSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
