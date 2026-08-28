import { Router } from "express";

import {
    createMerchantController,
    getAllMerchantsController,
    getMerchantByIdController,
    updateMerchantController,
} from "./merchant.controller";

import { asyncHandler } from "../../middleware/async-handler";

const router = Router();

router.post(
    "/",
    asyncHandler(createMerchantController)
);

router.get(
    "/",
    asyncHandler(getAllMerchantsController)
);

router.get(
    "/:id",
    asyncHandler(getMerchantByIdController)
);

router.patch(
    "/:id",
    asyncHandler(updateMerchantController)
);

export default router;