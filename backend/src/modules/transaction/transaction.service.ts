import prisma from "../../lib/prisma";
import { AppError } from "../../lib/app-error";

interface CreateTransactionInput {
    merchantId: string;
    customerId: string;
    amount: number;
    currency: string;
    status: "SUCCESS" | "FAILED" | "PENDING";
    paymentMethod:
        | "UPI"
        | "CARD"
        | "NETBANKING"
        | "WALLET"
        | "OTHER";
    failureReason?: string;
    timestamp?: Date;
}

export const createTransaction = async (
    input: CreateTransactionInput
) => {
    const merchant = await prisma.merchant.findUnique({
        where: {
            id: input.merchantId,
        },
    });

    if (!merchant) {
        throw new AppError(
            "Merchant not found",
            404,
            "MERCHANT_NOT_FOUND"
        );
    }

    const customer = await prisma.customer.findUnique({
        where: {
            id: input.customerId,
        },
    });

    if (!customer) {
        throw new AppError(
            "Customer not found",
            404,
            "CUSTOMER_NOT_FOUND"
        );
    }

    if (customer.merchantId !== input.merchantId) {
        throw new AppError(
            "Customer does not belong to this merchant",
            400,
            "CUSTOMER_MERCHANT_MISMATCH"
        );
    }

    return prisma.transaction.create({
        data: {
            merchantId: input.merchantId,
            customerId: input.customerId,
            amount: input.amount,
            currency: input.currency,
            status: input.status,
            paymentMethod: input.paymentMethod,
            failureReason: input.failureReason,
            timestamp: input.timestamp ?? new Date(),
        },
    });
};

export const getAllTransactions = async () => {
    return prisma.transaction.findMany({
        orderBy: {
            timestamp: "desc",
        },
    });
};

export const getTransactionById = async (id: string) => {
    return prisma.transaction.findUnique({
        where: {
            id,
        },
    });
};