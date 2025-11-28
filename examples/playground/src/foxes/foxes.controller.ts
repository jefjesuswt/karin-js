import { Controller, Get, Post, Put, Delete, Body, Param } from "@karin-js/core";
import { FoxesService } from "./foxes.service";
import { type CreateFoxesDto } from "./dtos/create-foxes.dto";
import { type UpdateFoxesDto } from "./dtos/update-foxes.dto";

@Controller("/foxes")
export class FoxesController {
  constructor(private readonly service: FoxesService) {}

  @Post("/")
  create(@Body() body: CreateFoxesDto) {
    return this.service.create(body);
  }

  @Get("/")
  findAll() {
    return this.service.findAll();
  }

  @Get("/:id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Put("/:id")
  update(@Param("id") id: string, @Body() body: UpdateFoxesDto) {
    return this.service.update(id, body);
  }

  @Delete("/:id")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
