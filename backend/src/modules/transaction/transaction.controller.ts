import { Request, Response } from "express";

import {
    createTransaction,
    getAllTransactions,
    getTransactionById,
} from "./transaction.service";

import {
    createTransactionSchema,
    transactionIdParamSchema,
} from "./transaction.validation";

export const createTransactionController = async (
    req: Request,
    res: Response
) => {
    const validatedData = createTransactionSchema.parse(req.body);

    const transaction = await createTransaction(validatedData);

    return res.status(201).json({
        success: true,
        data: transaction,
    });
};

export const getAllTransactionsController = async (
    _req: Request,
    res: Response
) => {
    const transactions = await getAllTransactions();

    return res.status(200).json({
        success: true,
        data: transactions,
    });
};

export const getTransactionByIdController = async (
    req: Request,
    res: Response
) => {
    const { id } = transactionIdParamSchema.parse(req.params);

    const transaction = await getTransactionById(id);

    if (!transaction) {
        return res.status(404).json({
            success: false,
            code: "TRANSACTION_NOT_FOUND",
            message: "Transaction not found",
        });
    }

    return res.status(200).json({
        success: true,
        data: transaction,
    });
};