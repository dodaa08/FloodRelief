import { z } from "zod";

// Accepts "+91 98765-43210", "09876543210", "98765 43210" … and stores
// the bare 10-digit number so the same person can't register twice
// with different formatting.
export const phoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .transform((value) => value.replace(/[\s\-().]/g, "").replace(/^(\+?91|0)/, ""))
  .refine((value) => /^[6-9]\d{9}$/.test(value), "Enter a valid 10-digit mobile number");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters");

export const signupSchema = z
  .object({
    phone: phoneSchema,
    name: z.string().trim().min(1, "Name cannot be blank").max(100).optional(),
    password: passwordSchema,
    role: z.enum(["CITIZEN", "VOLUNTEER", "NGO_COORDINATOR"]).optional(),
    orgName: z.string().trim().min(2).max(120).optional(),
    orgEmail: z.string().trim().email().max(120).optional(),
    orgWebsite: z.string().trim().max(200).optional(),
    orgContactPhone: phoneSchema.optional(),
    orgRegistrationId: z.string().trim().max(80).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.role && value.role !== "CITIZEN" && !value.name) {
      ctx.addIssue({
        code: "custom",
        path: ["name"],
        message: "Name is required for volunteers and coordinators",
      });
    }
    if (value.role === "NGO_COORDINATOR" && (!value.orgName || !value.orgEmail)) {
      ctx.addIssue({
        code: "custom",
        path: ["orgName"],
        message: "Organization name and official email are required for coordinators",
      });
    }
  });

export const signinSchema = z.object({
  phone: phoneSchema,
  password: passwordSchema,
});

export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
