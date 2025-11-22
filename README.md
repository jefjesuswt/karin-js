# Karin-JS 🦊

A modern, enterprise-friendly backend framework for Bun. Lightweight. Fast. Designed for developers who want simplicity and power.

[![NPM Version](https://img.shields.io/npm/v/@karin-js/core)](https://www.npmjs.com/package/@karin-js/core)
[![Bun Version](https://img.shields.io/badge/bun-%3E%3D1.2.10-lightgrey?logo=bun)](https://bun.sh/)

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
| **H3 Adapter**   | 0.99              | 100,469      | 9.06         | 0.05         |
| **Hono Adapter** | 1.23              | 81,061       | 13.29        | 0.04         |
| **NestJS**       | 10.05             | 9,941        | 602.08       | 2.85         |

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

```bash
bun add @karin-js/core @karin-js/platform-h3
# Or for Edge:
bun add @karin-js/core @karin-js/platform-hono
```

## Quick Start

**1. Define a controller**
`src/users.controller.ts`

```typescript
import { Controller, Get } from "@karin-js/core";

@Controller("/users")
export class UsersController {
  @Get("/")
  getUsers() {
    return [{ id: 1, name: "John Doe" }];
  }
}
```

**2. Bootstrap**
`src/main.ts`

```typescript
import "reflect-metadata";
import { KarinFactory } from "@karin-js/core";
import { H3Adapter } from "@karin-js/platform-h3";
// or: import { HonoAdapter } from "@karin-js/platform-hono";

async function bootstrap() {
  const app = await KarinFactory.create(new H3Adapter(), {
    scan: "./src/**/*.controller.ts",
  });
  app.listen(3000);
}
bootstrap();
```

## Contributing

Karin-JS welcomes contributors, testers, and feedback at all stages!

## License

Karin-JS is [MIT licensed](LICENSE).
