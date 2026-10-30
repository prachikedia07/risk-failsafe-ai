
import { Router, Request, Response, NextFunction } from "express";
import { readFile } from "fs/promises";
import path from "path";

const router = Router();

router.get(
    "/",
    async (
        _req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const reportPath = path.resolve(
                process.cwd(),
                "data",
                "evaluation-results",
                "latest-risk-evaluation.json"
            );

            const report = await readFile(
                reportPath,
                "utf-8"
            );

            res.json({
                success: true,
                data: JSON.parse(report),
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
