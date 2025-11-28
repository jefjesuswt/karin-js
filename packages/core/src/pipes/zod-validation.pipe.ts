import type { ZodType, ZodError, z } from "zod";
import type { PipeTransform, ArgumentMetadata } from "../interfaces";
import { BadRequestException } from "../exceptions/http.exception";

export class ZodValidationPipe implements PipeTransform {
  constructor(public readonly schema: ZodType<any>) {}

  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type === "custom") return value;

    const result = this.schema.safeParse(value);

    if (result.success) {
      return result.data;
    }

    const zodError = result.error as ZodError;

    const errors = zodError.issues.map((err: z.core.$ZodIssue) => ({
      field: err.path.join("."),
      message: err.message,
      code: err.code,
    }));

    throw new BadRequestException({
      message: "Validation failed",
      errors: errors,
    });
  }
}
