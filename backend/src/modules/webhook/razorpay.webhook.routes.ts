import { Router } from "express";

import {
    razorpayWebhookController,
} from "./razorpay.webhook";

import { asyncHandler } from "../../middleware/async-handler";

const router = Router();

router.post(
    "/",
    asyncHandler(
        razorpayWebhookController
    )
);

export default router;