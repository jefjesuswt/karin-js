import {
    Catch,
    type ExceptionFilter,
    type ArgumentsHost,
    Logger,
} from "@karin-js/core";
import { Error as MongooseError } from "mongoose";

/**
 * Filtro global para manejar errores específicos de Mongoose
 * 
 * Captura errores como:
 * - ValidationError: Errores de validación de schema
 * - CastError: Errores de conversión de tipos (ej: ObjectId inválido)
 * - DocumentNotFoundError: Documento no encontrado
 */
@Catch(MongooseError.ValidationError, MongooseError.CastError)
export class MongooseExceptionFilter implements ExceptionFilter {
    private logger = new Logger("MongooseExceptionFilter");

    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>();

        this.logger.error(`Mongoose Error: ${exception.message}`);

        // Manejo específico según el tipo de error
        if (exception instanceof MongooseError.ValidationError) {
            return this.handleValidationError(exception, request);
        }

        if (exception instanceof MongooseError.CastError) {
            return this.handleCastError(exception, request);
        }

        // Error genérico de Mongoose
        return new Response(
            JSON.stringify({
                statusCode: 500,
                timestamp: new Date().toISOString(),
                path: request.url,
                error: "Database Error",
                message: exception.message,
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
        const errors = Object.keys(exception.errors).map((key) => ({
            field: key,
            message: exception.errors[key].message,
        }));

        return new Response(
            JSON.stringify({
                statusCode: 400,
                timestamp: new Date().toISOString(),
                path: request.url,
                error: "Validation Error",
                message: "Los datos proporcionados no son válidos",
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
                message: `El valor '${exception.value}' no es un ID válido para el campo '${exception.path}'`,
            }),
            {
                status: 400,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}
