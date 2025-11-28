import { Controller, Get } from "@karin-js/core";

@Controller("/fox")
export class FoxController {
  @Get("/")
  findAll() {
    return { message: "This action returns all fox" };
  }
}
