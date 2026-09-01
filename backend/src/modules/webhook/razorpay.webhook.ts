import "dotenv/config";

import {
    createHmac,
    timingSafeEqual,
} from "crypto";

import {
    Request,
    Response,
} from "express";
import { processRazorpayWebhook } from "./razorpay.webhook.service";

const webhookSecret =
    process.env.RAZORPAY_WEBHOOK_SECRET;

if (!webhookSecret) {
    throw new Error(
        "RAZORPAY_WEBHOOK_SECRET is not configured"
    );
}

export const razorpayWebhookController = async (
    req: Request,
    res: Response
) => {
    const signature =
        req.header(
            "X-Razorpay-Signature"
        );

    if (!signature) {
        return res.status(400).json({
            success: false,
            message:
                "Missing Razorpay webhook signature",
        });
    }

    if (!Buffer.isBuffer(req.body)) {
        return res.status(400).json({
            success: false,
            message:
                "Webhook body must be raw",
        });
    }

    const expectedSignature =
        createHmac(
            "sha256",
            webhookSecret
        )
            .update(req.body)
            .digest("hex");

    const receivedBuffer =
        Buffer.from(
            signature,
            "utf8"
        );

    const expectedBuffer =
        Buffer.from(
            expectedSignature,
            "utf8"
        );

    if (
        receivedBuffer.length !==
        expectedBuffer.length
    ) {
        return res.status(400).json({
            success: false,
            message:
                "Invalid webhook signature",
        });
    }

    if (
        !timingSafeEqual(
            receivedBuffer,
            expectedBuffer
        )
    ) {
        return res.status(400).json({
            success: false,
            message:
                "Invalid webhook signature",
        });
    }

    const event = JSON.parse(
        req.body.toString("utf8")
    );

    const eventId =
        req.header(
            "x-razorpay-event-id"
        );

        if (!eventId) {
    return res.status(400).json({
        success: false,
        message:
            "Missing Razorpay event ID",
    });
}

const result =
    await processRazorpayWebhook(
        event,
        eventId
    );

console.log(
    "✅ Razorpay webhook verified"
);

console.log(
    "Event:",
    event.event
);

console.log(
    "Event ID:",
    eventId
);

if (result.processed) {
    console.log(
        "✅ Transaction created:",
        result.transaction.id
    );
} else {
    console.log(
        "ℹ️ Webhook not processed:",
        result.reason
    );
}

return res.status(200).json({
    success: true,
    message:
        "Razorpay webhook processed",
    data: result,
});
};