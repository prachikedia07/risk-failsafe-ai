import prisma from "../../lib/prisma";

interface CreateMerchantInput {
    name: string;
}

interface UpdateMerchantInput {
    name: string;
}

export const createMerchant = async ({
    name,
}: CreateMerchantInput) => {
    return prisma.merchant.create({
        data: {
            name,
        },
    });
};

export const getAllMerchants = async () => {
    return prisma.merchant.findMany({
        orderBy: {
            createdAt: "desc",
        },
    });
};

export const getMerchantById = async (id: string) => {
    return prisma.merchant.findUnique({
        where: {
            id,
        },
    });
};

export const updateMerchant = async (
    id: string,
    { name }: UpdateMerchantInput
) => {
    return prisma.merchant.update({
        where: {
            id,
        },
        data: {
            name,
        },
    });
};
