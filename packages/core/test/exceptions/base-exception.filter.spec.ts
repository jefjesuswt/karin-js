import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { BaseExceptionFilter } from "../../src/exceptions/base-exception.filter";
import { BadRequestException } from "../../src/exceptions/http.exception";
import type { ArgumentsHost } from "../../src/interfaces";

describe("BaseExceptionFilter", () => {
  const filter = new BaseExceptionFilter();
  const mockHost = {} as ArgumentsHost;

  const originalLog = console.log;
  const originalError = console.error;

  beforeEach(() => {
    console.log = mock(() => {});
    console.error = mock(() => {});
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
  });

  it("should format HttpException correctly", () => {
    const exception = new BadRequestException("Invalid data");
    const response = filter.catch(exception, mockHost);

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(400);
  });

  it("should return correct JSON body structure for HTTP exceptions", async () => {
    const exception = new BadRequestException({
      error: "Validation",
      code: 123,
    });
    const response = filter.catch(exception, mockHost);
    const body = await response.json();

    expect(body).toEqual({
      statusCode: 400,
      error: "Validation",
      code: 123,
    });
  });

  it("should handle unknown errors as Internal Server Error (500)", () => {
    const randomError = new Error("Something exploded");
    const response = filter.catch(randomError, mockHost);

    expect(response.status).toBe(500);
  });
});
