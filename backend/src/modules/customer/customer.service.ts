import prisma from '../../lib/prisma';

import { AppError } from '../../lib/app-error';

interface createCustomerInput {
    name: string;
    merchantId: string;
}

interface updateCustomerInput {
    name?: string;
}

export const createCustomer = async ({
    name, merchantId
}: createCustomerInput) => {
    // Make sure the merchant exists before creating the customer.
    const merchant = await prisma.merchant.findUnique({
        where: {
            id: merchantId,
        },
    });

    if (!merchant) {
        throw new AppError(
            "Merchant not found",
            404,
            "MERCHANT_NOT_FOUND"
        );
    }
    return prisma.customer.create({
        data: {
            name,
            merchantId
        }
    });
};

export const getAllCustomers = async()=>{
    return prisma.customer.findMany({
        orderBy: {
            createdAt: "desc",
        },
    });
}

export const getCustomerById = async (id: string) => {
    return prisma.customer.findUnique({
        where:{
            id,
        },
    });
}

export const updateCustomer = async (
    id: string,
    { name }: updateCustomerInput
) =>  {
    // Don't issue an update with an empty object.
    if (name === undefined) {
        throw new AppError(
            "No fields were provided for update",
            400,
            "EMPTY_UPDATE"
        );
    }
    return prisma.customer.update({
        where: {
            id
        },
        data: {
            name,
        }
    });
};
