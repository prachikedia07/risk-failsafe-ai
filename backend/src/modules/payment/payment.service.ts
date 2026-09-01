import { razorpay } from "../../lib/razorpay";

export const createTestOrder = async (
    amount: number
) => {
    return razorpay.orders.create({
        amount,
        currency: "INR",
        receipt:
            `test_receipt_${Date.now()}`,
    });
};