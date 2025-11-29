# @karin-js/platform-h3

H3 HTTP adapter for Karin-JS, optimized for maximum performance on Node.js and Bun.

## Installation

```bash
bun add @karin-js/core @karin-js/platform-h3
```

## Overview

The H3 adapter provides:
- ✅ Maximum performance
- ✅ Optimized for Node.js and Bun
- ✅ Minimal overhead
- ✅ Production-ready

## Usage

```typescript
import { KarinFactory } from "@karin-js/core";
import { H3Adapter } from "@karin-js/platform-h3";

const app = await KarinFactory.create(new H3Adapter(), {
  scan: "./src/**/*.ts",
});

app.listen(3000);
```

## Features

- **High Performance**: Optimized for speed
- **Low Overhead**: Minimal abstraction layer
- **Production Ready**: Battle-tested H3 foundation
- **Modern**: Built for modern runtimes

## Performance

H3 adapter provides the best performance among Karin adapters:
- Fastest request handling
- Lowest latency
- Optimized for high-throughput scenarios

## When to Use

Choose H3 adapter when:
- Maximum performance is the priority
- Running on Node.js or Bun (not Edge)
- Building high-traffic APIs
- You need the fastest possible framework overhead

Choose Hono adapter when:
- Deploying to Edge runtimes
- Portability across runtimes is important
- Building serverless functions

## License

MIT
