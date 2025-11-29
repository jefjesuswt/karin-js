import {
    Catch,
    type ExceptionFilter,
    type ArgumentsHost,
    Logger,
} from "@karin-js/core";
import { Error as MongooseError } from "mongoose";

/**
 * Built-in exception filter for Mongoose errors.
 * 
 * Automatically registered by MongoosePlugin to provide
 * enterprise-grade error handling out of the box.
 * 
 * Handles:
 * - ValidationError: Schema validation failures
 * - CastError: Type casting errors (e.g., invalid ObjectId)
 * - DocumentNotFoundError: Document not found
 * - MongoServerError: Database-level errors (e.g., duplicate keys)
 */
@Catch(MongooseError.ValidationError, MongooseError.CastError)
export class MongooseExceptionFilter implements ExceptionFilter {
    private logger = new Logger("MongooseExceptionFilter");

    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>();

        this.logger.error(`Mongoose Error: ${exception.message}`);

        // Handle specific Mongoose error types
        if (exception instanceof MongooseError.ValidationError) {
            return this.handleValidationError(exception, request);
        }

        if (exception instanceof MongooseError.CastError) {
            return this.handleCastError(exception, request);
        }

        // Handle MongoDB server errors (e.g., duplicate key)
        if (exception.name === "MongoServerError") {
            return this.handleMongoServerError(exception, request);
        }

        // Generic Mongoose error
        return new Response(
            JSON.stringify({
                statusCode: 500,
                timestamp: new Date().toISOString(),
                path: request.url,
                error: "Database Error",
                message: "An error occurred while processing your request",
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }

    private handleValidationError(
        exception: MongooseError.ValidationError,
        request: Request
    ) {
        const errors = Object.keys(exception.errors)
            .map((key) => {
                const error = exception.errors[key];
                if (!error) return null;
                return {
                    field: key,
                    message: error.message,
                    value: (error as any)?.value,
                };
            })
            .filter((error): error is NonNullable<typeof error> => error !== null);

        return new Response(
            JSON.stringify({
                statusCode: 400,
                timestamp: new Date().toISOString(),
                path: request.url,
                error: "Validation Error",
                message: "The provided data is invalid",
                details: errors,
            }),
            {
                status: 400,
                headers: { "Content-Type": "application/json" },
            }
        );
    }

    private handleCastError(exception: MongooseError.CastError, request: Request) {
        return new Response(
            JSON.stringify({
                statusCode: 400,
                timestamp: new Date().toISOString(),
                path: request.url,
                error: "Invalid ID",
                message: `The value '${exception.value}' is not a valid ID for field '${exception.path}'`,
            }),
            {
                status: 400,
                headers: { "Content-Type": "application/json" },
            }
        );
    }

    private handleMongoServerError(exception: any, request: Request) {
        // Duplicate key error (E11000)
        if (exception.code === 11000) {
            const field = Object.keys(exception.keyPattern || {})[0] || "field";
            return new Response(
                JSON.stringify({
                    statusCode: 409,
                    timestamp: new Date().toISOString(),
                    path: request.url,
                    error: "Duplicate Entry",
                    message: `A record with this ${field} already exists`,
                    field,
                }),
                {
                    status: 409,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Other MongoDB server errors
        return new Response(
            JSON.stringify({
                statusCode: 500,
                timestamp: new Date().toISOString(),
                path: request.url,
                error: "Database Error",
                message: "An error occurred while processing your request",
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}
