import { Controller, Get, BadRequestException } from "@karin-js/core";

@Controller("/bench")
export class BenchController {
  @Get("/")
  simple() {
    return { hello: "world" };
  }

  @Get("/error")
  triggerError() {
    throw new BadRequestException("Ups, algo salió mal intencionalmente");
  }
}
