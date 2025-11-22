import { Controller, Get, Post, Body, Query, Param } from "@karin-js/core";

@Controller("/bench")
export class BenchController {
  @Get("/")
  simple() {
    return { hello: "world" };
  }
}
