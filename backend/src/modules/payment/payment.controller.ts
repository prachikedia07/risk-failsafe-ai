import {
    Request,
    Response,
} from "express";

import { z } from "zod";

import {
    createTestOrder,
} from "./payment.service";

const createOrderSchema = z.object({
    amount: z
        .number()
        .int()
        .positive()
        .max(1000000),

    merchantId: z.uuid(
        "Invalid merchant ID"
    ),

    customerId: z.uuid(
        "Invalid customer ID"
    ),
});

export const createTestOrderController = async (
    req: Request,
    res: Response
) => {
    const data =
        createOrderSchema.parse(
            req.body
        );

    const order =
        await createTestOrder(data);

    return res.status(201).json({
        success: true,
        data: order,
    });
};