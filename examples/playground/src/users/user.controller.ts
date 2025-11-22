import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Headers,
  UseGuards,
  ZodValidationPipe,
} from "@karin-js/core";
import { AuthGuard } from "../guards/auth.guard";
import { CreateUserSchema, type CreateUserDto } from "./dtos/create-user.dto";

@Controller("/features")
@UseGuards(AuthGuard) // 1. Prueba de Guard a nivel de clase
export class FeaturesController {
  @Get("/hello/:name")
  // 2. Prueba de extracción de params, query y headers
  getHello(
    @Param("name") name: string,
    @Query("lang") lang: string,
    @Headers("user-agent") agent: string
  ) {
    return {
      message: `Hola ${name}`,
      details: {
        lang: lang || "es",
        browser: agent,
      },
    };
  }

  @Post("/users")
  // 3. Prueba de Pipe de Validación con Zod
  createUser(
    @Body(new ZodValidationPipe(CreateUserSchema)) body: CreateUserDto
  ) {
    return {
      status: "success",
      id: Math.floor(Math.random() * 1000),
      receivedData: body,
    };
  }
}
