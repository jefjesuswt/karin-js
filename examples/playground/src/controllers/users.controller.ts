import { Controller, Get, Post, Body, Query, Param } from "@karinjs/core";

@Controller("/bench")
export class BenchController {
  @Get("/")
  simple() {
    return { hello: "world" };
  }
}
