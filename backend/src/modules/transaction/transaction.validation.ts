import { z } from "zod";

export const transactionIdParamSchema = z.object({
    id: z.uuid("Invalid transaction ID"),
});

export const createTransactionSchema = z
    .object({
        merchantId: z.uuid("Invalid merchant ID"),

        customerId: z.uuid("Invalid customer ID"),

        amount: z
            .number()
            .int("Amount must be an integer in paise")
            .positive("Amount must be greater than zero"),

        currency: z
            .string()
            .length(3, "Currency must be a 3-letter code")
            .default("INR"),

        status: z.enum(["SUCCESS", "FAILED", "PENDING"]),

        paymentMethod: z.enum([
            "UPI",
            "CARD",
            "NETBANKING",
            "WALLET",
            "OTHER",
        ]),

        failureReason: z
            .string()
            .trim()
            .min(1)
            .max(200)
            .optional(),

        timestamp: z.coerce.date().optional(),
    })
    .strict()
    .superRefine((data, ctx) => {
        if (data.status === "FAILED" && !data.failureReason) {
            ctx.addIssue({
                code: "custom",
                path: ["failureReason"],
                message:
                    "Failure reason is required for failed transactions",
            });
        }

        if (data.status !== "FAILED" && data.failureReason) {
            ctx.addIssue({
                code: "custom",
                path: ["failureReason"],
                message:
                    "Failure reason can only be provided for failed transactions",
            });
        }
    });