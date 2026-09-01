import { Router } from "express";

import {
    createTestOrderController,
} from "./payment.controller";

import {
    asyncHandler,
} from "../../middleware/async-handler";

const router = Router();

router.post(
    "/test-order",
    asyncHandler(
        createTestOrderController
    )
);

export default router;