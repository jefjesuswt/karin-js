import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from "@karin-js/core";
import { DogsService } from "./dogs.service";
import type { CreateDogsDto } from "./dtos/create-dogs.dto";
import type { UpdateDogsDto } from "./dtos/update-dogs.dto";


@Controller("/dogs")
export class DogsController {
  constructor(private readonly service: DogsService) { }

  @Post("/")
  create(@Body() body: CreateDogsDto) {
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
  update(@Param("id") id: string, @Body() body: UpdateDogsDto) {
    return this.service.update(id, body);
  }

  @Delete("/:id")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
