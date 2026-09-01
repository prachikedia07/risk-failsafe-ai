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
        .max(100000),
});

export const createTestOrderController = async (
    req: Request,
    res: Response
) => {
    const { amount } =
        createOrderSchema.parse(
            req.body
        );

    const order =
        await createTestOrder(
            amount
        );

    return res.status(201).json({
        success: true,
        data: order,
    });
};