import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "../generated/prisma/client";

import { AppError } from "../lib/app-error";

export const errorMiddleware = (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {
    console.error(error);

    // Our expected application errors
    if (error instanceof AppError) {
        return res.status(error.statusCode).json({
            success: false,
            code: error.code,
            message: error.message,
        });
    }

    // Request validation errors
    if (error instanceof ZodError) {
        return res.status(400).json({
            success: false,
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            errors: error.issues,
        });
    }

    // Known Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
            case "P2002":
                return res.status(409).json({
                    success: false,
                    code: "DUPLICATE_RESOURCE",
                    message: "A record with these values already exists",
                });

            case "P2003":
                return res.status(400).json({
                    success: false,
                    code: "INVALID_RELATION",
                    message: "A referenced record does not exist",
                });

            case "P2025":
                return res.status(404).json({
                    success: false,
                    code: "RECORD_NOT_FOUND",
                    message: "Requested record was not found",
                });
        }
    }

    // Unknown errors
    return res.status(500).json({
        success: false,
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
    });
};