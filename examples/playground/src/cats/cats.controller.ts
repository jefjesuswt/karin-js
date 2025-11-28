import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ZodValidationPipe,
} from "@karin-js/core";
import { CatsService } from "./cats.service";
import { CreateCatSchema, type CreateCatDto } from "./dtos/create-cat.dto";

@Controller("/cats")
export class CatsController {
  constructor(private readonly catsService: CatsService) {}

  @Post("/")
  async create(
    @Body(new ZodValidationPipe(CreateCatSchema)) body: CreateCatDto
  ) {
    const cat = await this.catsService.create(body);
    return {
      message: "Cat created successfully 🐱",
      data: cat,
    };
  }

  @Get("/")
  async findAll() {
    return this.catsService.findAll();
  }

  @Get("/:id")
  async findOne(@Param("id") id: string) {
    return this.catsService.findOne(id);
  }
}
