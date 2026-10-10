import { z } from "zod";

export const floodStatusSchema = z.enum(["NORMAL", "WATCH", "WARNING", "FLOODED"]);
export const statusSourceSchema = z.enum(["API_READING", "GROUND_REPORTS", "MANUAL"]);

export const setDistrictStatusSchema = z.object({
  status: floodStatusSchema,
  reason: z.string().trim().max(500).optional(),
});

export type FloodStatusInput = z.infer<typeof floodStatusSchema>;
export type SetDistrictStatusInput = z.infer<typeof setDistrictStatusSchema>;
