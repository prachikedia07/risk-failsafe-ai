import { Router } from "express";

import {
    createTransactionController,
    getAllTransactionsController,
    getTransactionByIdController,
} from "./transaction.controller";

import { asyncHandler } from "../../middleware/async-handler";

const router = Router();

router.post(
    "/",
    asyncHandler(createTransactionController)
);

router.get(
    "/",
    asyncHandler(getAllTransactionsController)
);

router.get(
    "/:id",
    asyncHandler(getTransactionByIdController)
);

export default router;