import { createParamDecorator, type ExecutionContext } from "@karin-js/core";

export const User = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.headers.get("user") || "Guest";

    return data ? { [data]: user } : user;
  }
);
