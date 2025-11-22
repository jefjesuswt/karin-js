export class HttpException extends Error {
  constructor(
    public readonly response: string | object,
    public readonly status: number
  ) {
    super();
    this.message =
      typeof response === "string" ? response : JSON.stringify(response);
  }
}

export class BadRequestException extends HttpException {
  constructor(message: string | object = "Bad Request") {
    super(message, 400);
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message: string | object = "Unauthorized") {
    super(message, 401);
  }
}

export class ForbiddenException extends HttpException {
  constructor(message: string | object = "Forbidden") {
    super(message, 403);
  }
}

export class NotFoundException extends HttpException {
  constructor(message: string | object = "Not Found") {
    super(message, 404);
  }
}

export class InternalServerErrorException extends HttpException {
  constructor(message: string | object = "Internal Server Error") {
    super(message, 500);
  }
}
