import { describe, it, expect } from "bun:test";
import { z } from "zod";
import { ZodValidationPipe } from "../../src/pipes/zod-validation.pipe";
import { BadRequestException } from "../../src/exceptions/http.exception";

describe("ZodValidationPipe", () => {
  // Esquema de prueba
  const schema = z.object({
    name: z.string(),
    age: z.number().min(18),
  });

  const pipe = new ZodValidationPipe(schema);
  const metadata: any = { type: "body" }; // Mock simple de metadata

  it("should validate and transform correct values", () => {
    const validData = { name: "Karin", age: 20 };
    const result = pipe.transform(validData, metadata);

    expect(result).toEqual(validData);
  });

  it("should throw BadRequestException for invalid data", () => {
    const invalidData = { name: "Karin", age: 10 }; // Menor de edad

    // Verificamos que lance la excepción exacta
    expect(() => {
      pipe.transform(invalidData, metadata);
    }).toThrow(BadRequestException);
  });

  it("should ignore validation if type is 'custom'", () => {
    // Los pipes a veces ignoran decoradores custom como @User()
    const result = pipe.transform({ random: "data" }, { type: "custom" });
    expect(result).toEqual({ random: "data" });
  });
});
