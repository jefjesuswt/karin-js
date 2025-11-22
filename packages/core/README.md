# @karin-js/core 🦊

The core library for Karin-JS, the Enterprise Framework for Bun. Built for speed, designed for sanity.

[![NPM Version](https://img.shields.io/npm/v/@karin-js/core)](https://www.npmjs.com/package/@karin-js/core)
[![Build Status](https://img.shields.io/github/actions/workflow/status/your-username/karin-js/ci.yml?branch=main)](https://github.com/your-username/karin-js/actions)
[![Bun Version](https://img.shields.io/badge/bun-%3E%3D1.0.0-lightgrey?logo=bun)](https://bun.sh/)
[![License](https://img.shields.io/npm/l/@karin-js/core)](https://github.com/your-username/karin-js/blob/main/LICENSE)

---

## What is Karin-JS?

Karin-JS is a humble, alternative backend framework inspired by emerging JavaScript technologies and new developer experience patterns. It is designed around a file-based, module-less architecture, focusing on speed and a clean mental model. Karin-JS attempts to offer a familiar, yet refreshingly simple approach—making it ideal for modern API projects.

- **⚡ Built for Bun:** Fully leverages Bun runtime for maximum performance.
- **🗂️ Module-less and feature-oriented:** Organize by "features" instead of modules for cleaner, more maintainable code.
- **💉 Dependency Injection:** Uses `tsyringe` for familiar and robust DI, taking inspiration from enterprise languages.
- **🔐 Full Type Safety:** Built in TypeScript for safe, reliable code.
- **🔌 Pluggable Adapters:** Easily swap between H3 (raw speed) and Hono (Edge/serverless) backends.

## Why Another Framework?

Frameworks like NestJS are extremely mature and proven; Karin-JS is a much newer, lighter alternative. It's not a "replacement" but another option for those who want to explore simpler patterns or leverage Bun’s unique speed.

- Module-less design simplifies onboarding and structure.
- Automatic controller file-scanning—no need for manual registration.
- Adapters let you pick the backend platform with one line of config.

## Benchmark

Karin-JS aims for world-class performance, enabled by Bun and careful optimization. Here’s a comparison using a basic benchmark handler:

| Adapter          | Avg. Latency (ms) | Requests/sec | Slowest (ms) | Fastest (ms) |
| :--------------- | :---------------- | :----------- | :----------- | :----------- |
| **H3 Adapter**   | 1.0064            | 98,505       | 16.1         | 0.059        |
| **Hono Adapter** | 1.27              | 77,814       | 21.69        | 0.073        |
| **NestJS**       | 10.05             | 9,940        | 602.08       | 2.85         |

<details>
<summary>See benchmark details</summary>

- **Hardware:** AMD Ryzen 5 5600X, Arch Linux
- **Each test:** 100,000 requests, 100 concurrency
- **Sample endpoint:** `GET /bench` (returns JSON, no DB)

Karin-JS, using H3Adapter, handled over **10 times more requests per second** than a standard NestJS application, with an average latency nearly ten times lower.

### Raw Console Output Images (Verification)

|                                     Karin-JS (H3)                                     |                                      Karin-JS (Hono)                                      |                                    NestJS                                    |
| :-----------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------: |
| <img src="./docs/oha-karinjs-h3-bench.png" width="250" alt="Karin-JS H3 Benchmark" /> | <img src="./docs/oha-karinjs-hono-bench.png" width="250" alt="Karin-JS Hono Benchmark" /> | <img src="./docs/oha-nestjs-bench.png" width="250" alt="NestJS Benchmark" /> |

</details>

## Installation

Install `@karin-js/core` along with its peer dependencies:

```bash
bun add @karin-js/core reflect-metadata tsyringe
```

To run a full Karin-JS application, you will also need a platform adapter, such as `@karin-js/platform-h3`:

```bash
bun add @karin-js/platform-h3
```

## Quick Start

`@karin-js/core` provides the decorators (`@Controller`, `@Get`) and the `KarinFactory` for bootstrapping your application.

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

Karin-JS is [MIT licensed](https://github.com/your-username/karin-js/blob/main/LICENSE).
