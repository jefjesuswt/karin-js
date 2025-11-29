# @karin-js/config

Configuration management plugin for Karin-JS with environment variable loading and validation.

## Installation

```bash
bun add @karin-js/config
```

## Overview

The Config plugin provides:
- ✅ Environment variable loading from `.env` files
- ✅ Schema validation with Zod
- ✅ Type-safe configuration access
- ✅ Required keys validation
- ✅ Custom configuration loaders

## Quick Start

```typescript
import { KarinFactory } from "@karin-js/core";
import { ConfigPlugin } from "@karin-js/config";

const config = new ConfigPlugin({
  requiredKeys: ["DATABASE_URL", "PORT"],
});

const app = await KarinFactory.create(adapter, {
  plugins: [config],
});

// Access config in services
@Service()
class AppService {
  constructor(private config: ConfigService) {}

  getDatabaseUrl() {
    return this.config.get("DATABASE_URL");
  }
}
```

## Features

### Environment Variables

Automatically loads `.env` files:

```env
# .env
DATABASE_URL=mongodb://localhost:27017/mydb
PORT=3000
API_KEY=secret123
```

### Required Keys

Ensure critical configuration is present:

```typescript
const config = new ConfigPlugin({
  requiredKeys: ["DATABASE_URL", "API_KEY"],
});
// Throws error if keys are missing
```

### Schema Validation

Validate configuration with Zod:

```typescript
import { z } from "zod";

const config = new ConfigPlugin({
  schema: z.object({
    PORT: z.string().transform(Number),
    DATABASE_URL: z.string().url(),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]),
  }),
});
```

### Custom Loaders

Load configuration from any source:

```typescript
const config = new ConfigPlugin({
  load: async () => ({
    port: 3000,
    database: await fetchFromVault(),
  }),
});
```

## Usage in Services

```typescript
import { Service } from "@karin-js/core";
import { ConfigService } from "@karin-js/config";

@Service()
export class DatabaseService {
  constructor(private config: ConfigService) {}

  connect() {
    const url = this.config.get("DATABASE_URL");
    // Connect to database
  }

  getAllConfig() {
    return this.config.getAll();
  }
}
```

## Lazy Resolution in Plugins

Use config values in other plugins:

```typescript
const config = new ConfigPlugin({
  requiredKeys: ["MONGO_URI"],
});

const app = await KarinFactory.create(adapter, {
  plugins: [
    config,
    new MongoosePlugin({
      uri: () => config.get("MONGO_URI"), // Lazy resolution
    }),
  ],
});
```

## API

### ConfigPlugin Options

```typescript
interface ConfigPluginOptions {
  // Load from .env file (default: true)
  loadEnv?: boolean;

  // Custom loader function
  load?: () => Record<string, any> | Promise<Record<string, any>>;

  // Zod schema for validation
  schema?: z.ZodSchema;

  // Required configuration keys
  requiredKeys?: string[];
}
```

### ConfigService Methods

```typescript
class ConfigService {
  // Get a configuration value
  get<T = string>(key: string): T;

  // Get all configuration
  getAll(): Record<string, any>;
}
```

## License

MIT
