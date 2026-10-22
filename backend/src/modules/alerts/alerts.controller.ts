import { Request, Response } from "express";
import prisma from "../../lib/prisma";

const VALID_STATUSES = [
    "OPEN",
    "REVIEWED",
    "RESOLVED",
] as const;

export const getAlertsController = async (
  _req: Request,
  res: Response
) => {
  const alerts = await prisma.riskAlert.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
    include: {
      riskAnalysis: {
        select: {
          prediction: true,
          features: true,
          reasons: true,
          createdAt: true,
        },
      },
    },
  });

  return res.status(200).json({
    success: true,
    data: alerts,
  });
};

export const updateAlertStatus = async (
    req: any,
    res: Response
) => {
    try {
        const { status } = req.body;

        if (
            typeof status !== "string" ||
            !VALID_STATUSES.includes(
                status as (typeof VALID_STATUSES)[number]
            )
        ) {
            return res.status(400).json({
                message:
                    "Status must be OPEN, REVIEWED, or RESOLVED",
            });
        }

        const alert = await prisma.riskAlert.update({
            where: {
                id: req.params.id,
            },
            data: {
                status: status as
                    | "OPEN"
                    | "REVIEWED"
                    | "RESOLVED",
            },
        });

        return res.json(alert);
    } catch (error) {
        console.error("Failed to update alert status:", error);

        return res.status(500).json({
            message: "Could not update alert status",
        });
    }
};