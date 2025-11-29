# @karin-js/platform-hono

Hono HTTP adapter for Karin-JS, optimized for Edge runtimes and serverless deployments.

## Installation

```bash
bun add @karin-js/core @karin-js/platform-hono
```

## Overview

The Hono adapter provides:
- ✅ Edge runtime support (Cloudflare Workers, Deno Deploy)
- ✅ Lightweight and fast
- ✅ Built-in middleware ecosystem
- ✅ Excellent TypeScript support

## Usage

```typescript
import { KarinFactory } from "@karin-js/core";
import { HonoAdapter } from "@karin-js/platform-hono";

const app = await KarinFactory.create(new HonoAdapter(), {
  scan: "./src/**/*.ts",
});

app.listen(3000);
```

## Serverless Deployment

### Cloudflare Workers

```typescript
import { HonoAdapter } from "@karin-js/platform-hono";
import { KarinFactory } from "@karin-js/core";
import { AppController } from "./app.controller";

const app = await KarinFactory.create(new HonoAdapter(), {
  controllers: [AppController],
  scan: false, // Disable file scanning for serverless
});

export default app.getHttpServer();
```

### Deno Deploy

```typescript
import { HonoAdapter } from "npm:@karin-js/platform-hono";
import { KarinFactory } from "npm:@karin-js/core";

const app = await KarinFactory.create(new HonoAdapter(), {
  scan: "./src/**/*.ts",
});

Deno.serve(app.getHttpServer().fetch);
```

## Features

- **Edge-first**: Designed for modern Edge runtimes
- **Lightweight**: Minimal overhead
- **Fast**: Excellent performance characteristics
- **Flexible**: Works in Node.js, Bun, Deno, and Edge

## Performance

Hono adapter provides excellent performance:
- ~97,000 req/sec (wrk benchmark)
- ~102,000 req/sec (oha benchmark)
- Sub-millisecond average latency

## When to Use

Choose Hono adapter when:
- Deploying to Edge runtimes (Cloudflare Workers, Deno Deploy)
- Building serverless functions
- You need a lightweight, portable solution
- Edge computing is a priority

Choose H3 adapter when:
- Maximum performance is critical
- Running on traditional servers (Node.js, Bun)
- You don't need Edge runtime support

## License

MIT
