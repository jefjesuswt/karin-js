# @karin-js/platform-hono 🦊

The Hono platform adapter for Karin-JS, offering **broad compatibility** for Edge and Serverless environments (Cloudflare Workers, Deno Deploy, etc.).

[![NPM Version](https://img.shields.io/npm/v/@karin-js/platform-hono)](https://www.npmjs.com/package/@karin-js/platform-hono)
[![Build Status](https://img.shields.io/github/actions/workflow/status/your-username/karin-js/ci.yml?branch=main)](https://github.com/your-username/karin-js/actions)
[![Bun Version](https://img.shields.io/badge/bun-%3E%3D1.0.0-lightgrey?logo=bun)](https://bun.sh/)
[![License](https://img.shields.io/npm/l/@karin-js/platform-hono)](https://github.com/your-username/karin-js/blob/main/LICENSE)

---

## Overview

`@karin-js/platform-hono` provides the integration layer between Karin-JS and the Hono framework. It is the recommended adapter when targeting environments outside of traditional Bun/Node.js servers due to Hono's robust support for Web Standards.

## Installation

Install `@karin-js/platform-hono` along with `@karin-js/core` and its peer dependencies:

```bash
bun add @karin-js/core @karin-js/platform-hono reflect-metadata tsyringe
```

## Quick Start

To use the Hono adapter, you'll pass an instance of `HonoAdapter` to `KarinFactory.create` when bootstrapping your Karin-JS application.

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
}
```

**2. Bootstrap the application**

`src/main.ts`

```typescript
import "reflect-metadata";
import { KarinFactory } from "@karin-js/core";
import { HonoAdapter } from "@karin-js/platform-hono";

async function bootstrap() {
  // Use the HonoAdapter instance
  const app = await KarinFactory.create(new HonoAdapter(), {
    scan: "./src/**/*.controller.ts",
  });

  app.listen(3000);
}

bootstrap();
```

**3. Run the server**

```bash
bun run src/main.ts
```

## Contributing

Karin-JS is currently in its early stages and we welcome all contributions.

## License

Karin-JS is [MIT licensed](https://github.com/your-username/karin-js/blob/main/LICENSE).
