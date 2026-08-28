import {z} from 'zod';
import {merchantIdParamSchema} from '../merchant/merchant.validation';

export const customerIdParamSchema = z.object({
    id: z.uuid("Invalid customer ID"),
});

export const createCustomerSchema = z.object({
    name: z
    .string()
    .trim()
    .min(2, "Customer name must be at least 2 characters long")
    .max(100, "Customer name must be at most 100 characters long"),
    merchantId: merchantIdParamSchema.shape.id,
})
.strict();

export const updateCustomerSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "Customer name must be at least 2 characters long")
        .max(100, "Customer name must be at most 100 characters long")
        .optional(),
})
.strict();