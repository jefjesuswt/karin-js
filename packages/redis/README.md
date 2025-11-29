# @karin-js/redis

Redis client integration plugin for Karin-JS using ioredis.

## Installation

```bash
bun add @karin-js/redis ioredis
```

## Overview

The Redis plugin provides:
- ✅ Redis connection management
- ✅ Automatic reconnection
- ✅ Dependency injection for Redis client
- ✅ Lazy configuration resolution
- ✅ Graceful shutdown handling

## Quick Start

```typescript
import { RedisPlugin, InjectRedis } from "@karin-js/redis";
import type { Redis } from "ioredis";

// Configure plugin
const app = await KarinFactory.create(adapter, {
  plugins: [
    new RedisPlugin({
      url: "redis://localhost:6379",
    }),
  ],
});

// Use in services
@Service()
class CacheService {
  constructor(@InjectRedis() private redis: Redis) {}

  async set(key: string, value: string, ttl?: number) {
    if (ttl) {
      await this.redis.setex(key, ttl, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  async get(key: string) {
    return this.redis.get(key);
  }

  async del(key: string) {
    return this.redis.del(key);
  }
}
```

## Features

### Simple Configuration

```typescript
new RedisPlugin("redis://localhost:6379")
```

### Advanced Configuration

```typescript
new RedisPlugin({
  url: "redis://localhost:6379",
  options: {
    password: "secret",
    db: 0,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  },
})
```

### Lazy Configuration

Use with ConfigPlugin:

```typescript
const config = new ConfigPlugin({
  requiredKeys: ["REDIS_URL"],
});

const app = await KarinFactory.create(adapter, {
  plugins: [
    config,
    new RedisPlugin({
      url: () => config.get("REDIS_URL"),
      options: () => ({
        password: config.get("REDIS_PASSWORD"),
      }),
    }),
  ],
});
```

### Failure Strategy

Control what happens if Redis connection fails:

```typescript
new RedisPlugin({
  url: "redis://localhost:6379",
  failureStrategy: "warn", // or "fail"
})
```

- `"fail"` (default): Throw error and stop application
- `"warn"`: Log warning and continue without Redis

## Usage Examples

### Caching

```typescript
@Service()
class UsersService {
  constructor(
    @InjectRedis() private redis: Redis,
    @InjectModel(User) private userModel: Model<User>
  ) {}

  async findById(id: string) {
    // Check cache
    const cached = await this.redis.get(`user:${id}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from database
    const user = await this.userModel.findById(id);

    // Cache for 1 hour
    await this.redis.setex(`user:${id}`, 3600, JSON.stringify(user));

    return user;
  }
}
```

### Session Storage

```typescript
@Service()
class SessionService {
  constructor(@InjectRedis() private redis: Redis) {}

  async createSession(userId: string, data: any) {
    const sessionId = crypto.randomUUID();
    await this.redis.setex(
      `session:${sessionId}`,
      86400, // 24 hours
      JSON.stringify({ userId, ...data })
    );
    return sessionId;
  }

  async getSession(sessionId: string) {
    const data = await this.redis.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  async destroySession(sessionId: string) {
    await this.redis.del(`session:${sessionId}`);
  }
}
```

### Rate Limiting

```typescript
@Service()
class RateLimiter {
  constructor(@InjectRedis() private redis: Redis) {}

  async checkLimit(key: string, limit: number, window: number): Promise<boolean> {
    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, window);
    }

    return current <= limit;
  }
}

@Service()
class RateLimitGuard implements CanActivate {
  constructor(private rateLimiter: RateLimiter) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.headers.get("x-forwarded-for") || "unknown";

    const allowed = await this.rateLimiter.checkLimit(
      `ratelimit:${ip}`,
      100, // 100 requests
      60   // per minute
    );

    if (!allowed) {
      throw new HttpException("Rate limit exceeded", 429);
    }

    return true;
  }
}
```

## API

### RedisPlugin Options

```typescript
type RedisPluginOptions =
  | string  // Simple URL
  | RedisOptions  // ioredis options
  | {
      url?: string | (() => string);
      options?: RedisOptions | (() => RedisOptions);
      failureStrategy?: "fail" | "warn";
    };
```

### InjectRedis Decorator

```typescript
@InjectRedis() private redis: Redis
```

## Best Practices

1. **Use caching wisely** - Don't cache everything
2. **Set TTLs** - Prevent memory bloat
3. **Handle failures** - Redis should enhance, not block
4. **Use pipelines** - Batch operations for performance
5. **Monitor memory** - Use Redis monitoring tools

## License

MIT
