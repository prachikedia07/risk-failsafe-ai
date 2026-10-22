import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler";
import { getAlertsController, updateAlertStatus } from "./alerts.controller";

const router = Router();

router.get("/", asyncHandler(getAlertsController));
router.post("/:id/status", updateAlertStatus);

export default router;