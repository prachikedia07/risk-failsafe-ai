import { Router } from "express";

import {
    createCustomerController,
    getAllCustomersController,
    getCustomerByIdController,
    updateCustomerController,
} from "./customer.controller";

import { asyncHandler } from "../../middleware/async-handler";

const router = Router();

router.post("/", asyncHandler(createCustomerController));

router.get("/", asyncHandler(getAllCustomersController));

router.get("/:id", asyncHandler(getCustomerByIdController));

router.patch("/:id", asyncHandler(updateCustomerController));

export default router;