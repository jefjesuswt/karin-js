# @karin-js/platform-h3 🦊

The H3 platform adapter for Karin-JS, offering **maximum performance** in traditional server environments (Bun, Node.js).

[![NPM Version](https://img.shields.io/npm/v/@karin-js/platform-h3)](https://www.npmjs.com/package/@karin-js/platform-h3)
[![Build Status](https://img.shields.io/github/actions/workflow/status/your-username/karin-js/ci.yml?branch=main)](https://github.com/your-username/karin-js/actions)
[![Bun Version](https://img.shields.io/badge/bun-%3E%3D1.0.0-lightgrey?logo=bun)](https://bun.sh/)
[![License](https://img.shields.io/npm/l/@karin-js/platform-h3)](https://github.com/your-username/karin-js/blob/main/LICENSE)

---

## Overview

`@karin-js/platform-h3` provides the integration layer between Karin-JS and the H3 web framework. It is the fastest adapter available for Karin-JS.

## Installation

Install `@karin-js/platform-h3` along with `@karin-js/core` and its peer dependencies:

```bash
bun add @karin-js/core @karin-js/platform-h3 reflect-metadata tsyringe
```

## Quick Start

To use the H3 adapter, you'll pass an instance of `H3Adapter` to `KarinFactory.create` when bootstrapping your Karin-JS application.

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
import { H3Adapter } from "@karin-js/platform-h3";

async function bootstrap() {
  // We use the 'scan' option for automatic controller discovery (module-less architecture)
  const app = await KarinFactory.create(new H3Adapter(), {
    scan: "./src/**/*.controller.ts",
  });

  app.listen(3000); // Now supports optional host argument: app.listen(3000, '0.0.0.0');
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
