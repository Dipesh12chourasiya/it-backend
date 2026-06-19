import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { ZodError } from "zod";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = undefined;

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    statusCode = 400;
    message = "Validation Error";
    errors = err.issues.map((e: any) => ({
      field: e.path.join("."),
      message: e.message,
    }));
  }

  // Handle Mongoose CastError (e.g., invalid ObjectId)
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid format for field ${err.path}`;
  }

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  }

  // Log unexpected errors
  if (statusCode === 500 && process.env.NODE_ENV !== "test") {
    console.error("UNEXPECTED ERROR:", err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
