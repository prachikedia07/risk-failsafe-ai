import { razorpay } from "../../lib/razorpay";

interface CreateTestOrderInput {
    amount: number;
    merchantId: string;
    customerId: string;
}

export const createTestOrder = async ({
    amount,
    merchantId,
    customerId,
}: CreateTestOrderInput) => {
    return razorpay.orders.create({
        amount,
        currency: "INR",
        receipt: `test_receipt_${Date.now()}`,

        notes: {
            merchantId,
            customerId,
        },
    });
};