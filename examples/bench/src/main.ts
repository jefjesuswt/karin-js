import "reflect-metadata";
import { Controller, Fast, Get, KarinFactory, Service } from "@karin-js/core";
import { H3Adapter } from "@karin-js/platform-h3";

@Service()
class BenchService {
  getData() {
    return {
      id: 1,
      message: "Hello World",
      timestamp: 1234567890,
      items: [1, 2, 3, 4, 5],
    };
  }
}

@Controller("/bench")
class BenchController {
  constructor(private service: BenchService) { }

  @Get("/json")
  json() {
    return this.service.getData();
  }

  @Fast()
  @Get("/json-fast")
  jsonFast() {
    return this.service.getData();
  }
}

async function bootstrap() {
  const app = await KarinFactory.create(new H3Adapter(), {
    controllers: [BenchController],
    scan: false,
  });
  app.listen(3001);
}
bootstrap();
