import {z} from 'zod';

export const merchantIdParamSchema = z.object({
    id: z.uuid("Invalid merchant ID"),
});

export const createMerchantSchema = z.object({
    name: z
    .string()
    .trim()
    .min(2, "Merchant name must be at least 2 characters long")
    .max(100, "Merchant name must be at most 100 characters long"),
});
export const updateMerchantSchema = z.object({
    name: z
    .string()
    .trim()
    .min(2, "Merchant name must be at least 2 characters long")
    .max(100, "Merchant name must be at most 100 characters long")
})