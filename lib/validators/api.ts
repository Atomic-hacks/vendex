import { z } from "zod";

export const signupSchema = z
  .object({
    email: z.string().trim().email(),
    password: z.string().min(6),
    name: z.string().trim().min(1).max(120).optional(),
    role: z.enum(["BUYER", "VENDOR"]),
    storeName: z.string().trim().min(1).max(120).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "VENDOR" && !data.storeName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["storeName"],
        message: "storeName required for vendor",
      });
    }
  });

export const onboardingSchema = z
  .object({
    role: z.enum(["BUYER", "VENDOR"]),
    storeName: z.string().trim().min(1).max(120).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "VENDOR" && !data.storeName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["storeName"],
        message: "storeName required",
      });
    }
  });

export const orderIdSchema = z.object({
  orderId: z.string().trim().min(1),
});

export const shipOrderItemSchema = z.object({
  vendorId: z.string().trim().min(1),
  orderItemId: z.string().trim().min(1),
});
