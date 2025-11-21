# Karin-JS 🦊

The Enterprise Framework for Bun. Built for speed, designed for sanity.

[![NPM Version](https://img.shields.io/npm/v/@karin-js/core)](https://www.npmjs.com/package/@karin-js/core)

[![Bun Version](https://img.shields.io/badge/bun-%3E%3D1.2.21-lightgrey?logo=bun)](https://bun.sh/)
[![License](https://img.shields.io/npm/l/@karin-js/core)](https://github.com/your-username/karin-js/blob/main/LICENSE)

---

## Why Karin-JS?

Karin-JS is a next-generation, enterprise-ready framework for Node.js built on top of Bun. It's designed from the ground up to provide a development experience that is both incredibly fast and easy to maintain.

- **🚀 10x Faster than NestJS:** Leveraging the power of Bun and a highly optimized core, Karin-JS delivers unparalleled performance.
- **📦 Module-less Architecture:** Say goodbye to complex module systems. Karin-JS uses a simple, intuitive structure that makes your codebase cleaner and easier to reason about.
- **💉 True Dependency Injection:** With `tsyringe`, Karin-JS implements a robust and feature-rich dependency injection system, just like in enterprise languages like Java or C#.
- **🔒 Fully Type-Safe:** Written in TypeScript, Karin-JS provides a strongly-typed API to catch errors at compile time, not runtime.

## Benchmark

The results speak for themselves. In a head-to-head comparison with NestJS, Karin-JS demonstrates a significant performance advantage.

- **Hardware:** AMD Ryzen 5 5600X, Arch Linux

### Throughput (Requests/Second)

![Throughput Benchmark](./docs/assets/benchmark_throughput.png)
_Karin-JS: ~97,609 req/sec | NestJS: ~9,715 req/sec_

### Latency (ms)

![Latency Benchmark](./docs/assets/benchmark_latency.png)
_Karin-JS: ~1.01ms | NestJS: ~10.28ms_

> **Results:** Karin-JS handles 10x more requests per second than NestJS, with a latency of minus 10x.

## Installation

Get started with Karin-JS by installing the core packages:

```bash
bun add @karin-js/core @karin-js/platform-h3
```

## Quick Start

Create a fully functional HTTP server in just a few lines of code.

**1. Create your controller**

`src/users.controller.ts`

```typescript
import { Controller, Get } from "@karin-js/core";

@Controller("/users")
export class UsersController {
  @Get("/")
  getUsers() {
    return [{ id: 1, name: "John Doe" }];
  }

  @Get("/:id")
  getUser(id: string) {
    return { id, name: `User ${id}` };
  }
}
```

**2. Bootstrap the application**

`src/main.ts`

```typescript
import "reflect-metadata";
import { KarinFactory } from "@karin-js/core";
import { H3Adapter } from "@karin-js/platform-h3";
import { UsersController } from "./users.controller";

async function bootstrap() {
  const app = await KarinFactory.create(H3Adapter, {
    controllers: [UsersController],
  });

  app.listen(3000, () => {
    console.log("🦊 Karin-JS server running on http://localhost:3000");
  });
}

bootstrap();
```

**3. Run the server**

```bash
bun run src/main.ts
```

## Contributing

Karin-JS is currently in its early stages (Alpha v0.0.1) and we welcome all contributions. Please feel free to open issues or pull requests.

## License

Karin-JS is [MIT licensed](LICENSE).
