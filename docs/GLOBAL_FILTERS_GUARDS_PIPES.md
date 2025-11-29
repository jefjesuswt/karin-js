# Global Filters, Guards, and Pipes - Correct Usage

## The Problem: Initialization Order

### ❌ INCORRECT: Registering After `create()`

```typescript
// ❌ BAD: Los filtros se registran DESPUÉS del escaneo
const app = await KarinFactory.create(new HonoAdapter(), {
  scan: "./src/**/*.ts",
});

// ❌ DEMASIADO TARDE: Las rutas ya fueron registradas sin estos filtros
app.useGlobalFilters(new MongooseExceptionFilter());
app.useGlobalGuards(new AuthGuard());
app.useGlobalPipes(new ValidationPipe());
```

**Por qué falla:**

1. `KarinFactory.create()` escanea los controladores **inmediatamente**
2. Durante el escaneo, registra las rutas con los filtros/guards/pipes que existen **en ese momento**
3. Cuando llamas a `app.useGlobalFilters()` después, las rutas ya están registradas
4. Resultado: **Los filtros globales no se aplican a ninguna ruta**

### ✅ CORRECT: Registering in `KarinFactory.create()`

```typescript
// ✅ GOOD: Los filtros se registran ANTES del escaneo
const app = await KarinFactory.create(new HonoAdapter(), {
  scan: "./src/**/*.ts",
  globalFilters: [
    new MongooseExceptionFilter(),
    new HttpErrorFilter(),
  ],
  globalGuards: [
    new AuthGuard(),
  ],
  globalPipes: [
    new ValidationPipe(),
  ],
});
```

**Por qué funciona:**

1. Los filtros/guards/pipes se registran **antes** del escaneo
2. Cuando el framework escanea los controladores, **ya conoce** los filtros globales
3. Cada ruta se registra **con los filtros globales aplicados**
4. Resultado: **Los filtros globales funcionan correctamente**

## Complete Example

### 1. Create Your Filters

```typescript
// src/filters/mongoose.filter.ts
import {
  Catch,
  type ExceptionFilter,
  type ArgumentsHost,
  Logger,
} from "@karin-js/core";
import { Error as MongooseError } from "mongoose";

@Catch(MongooseError.ValidationError, MongooseError.CastError)
export class MongooseExceptionFilter implements ExceptionFilter {
  private logger = new Logger("MongooseExceptionFilter");

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();

    this.logger.error(`Mongoose Error: ${exception.message}`);

    if (exception instanceof MongooseError.ValidationError) {
      return this.handleValidationError(exception, request);
    }

    if (exception instanceof MongooseError.CastError) {
      return this.handleCastError(exception, request);
    }

    return new Response(
      JSON.stringify({
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: request.url,
        error: "Database Error",
        message: exception.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  private handleValidationError(
    exception: MongooseError.ValidationError,
    request: Request
  ) {
    const errors = Object.keys(exception.errors).map((key) => ({
      field: key,
      message: exception.errors[key].message,
    }));

    return new Response(
      JSON.stringify({
        statusCode: 400,
        timestamp: new Date().toISOString(),
        path: request.url,
        error: "Validation Error",
        message: "Los datos proporcionados no son válidos",
        details: errors,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  private handleCastError(exception: MongooseError.CastError, request: Request) {
    return new Response(
      JSON.stringify({
        statusCode: 400,
        timestamp: new Date().toISOString(),
        path: request.url,
        error: "Invalid ID",
        message: `El valor '${exception.value}' no es un ID válido para el campo '${exception.path}'`,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
```

```typescript
// src/filters/http.filter.ts
import {
  Catch,
  HttpException,
  type ExceptionFilter,
  type ArgumentsHost,
} from "@karin-js/core";

@Catch(HttpException)
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();

    const status = exception.status;
    const msg = exception.response;

    return new Response(
      JSON.stringify({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        error: msg,
      }),
      {
        status: status,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
```

### 2. Register Globally in `main.ts`

```typescript
// src/main.ts
import "reflect-metadata";
import { KarinFactory, Logger } from "@karin-js/core";
import { HonoAdapter } from "@karin-js/platform-hono";
import { ConfigPlugin } from "@karin-js/config";
import { MongoosePlugin } from "@karin-js/mongoose";
import { RedisPlugin } from "@karin-js/redis";
import { OpenApiPlugin } from "@karin-js/openapi";
import { MongooseExceptionFilter } from "./filters/mongoose.filter";
import { HttpErrorFilter } from "./filters/http.filter";

async function bootstrap() {
  const logger = new Logger("Bootstrap");

  const config = new ConfigPlugin({
    requiredKeys: ["MONGO_URI", "DB_NAME", "PORT"],
  });

  const app = await KarinFactory.create(new HonoAdapter(), {
    scan: "./src/**/*.ts",
    plugins: [
      config,
      new MongoosePlugin({
        uri: () => config.get("MONGO_URI"),
        options: () => ({
          dbName: config.get("DB_NAME"),
          authSource: "admin",
        }),
      }),
      new RedisPlugin({
        url: () => config.get("REDIS_URL"),
        failureStrategy: "warn",
      }),
      new OpenApiPlugin({ path: "/docs" }),
    ],
    // ✅ CORRECTO: Registrar filtros globales ANTES del escaneo
    globalFilters: [
      new MongooseExceptionFilter(),
      new HttpErrorFilter(),
    ],
  });

  const port = parseInt(config.get("PORT"), 10);
  app.listen(port, () => {
    logger.log(`🦊 Server running on http://localhost:${port}`);
  });
}

bootstrap();
```

## When to Use Global vs Controller-Level

### Global Filters (in `KarinFactory.create()`)

Use for **cross-cutting concerns** that apply to the entire application:

```typescript
globalFilters: [
  new MongooseExceptionFilter(),  // Database errors
  new HttpErrorFilter(),           // HTTP exceptions
  new LoggingFilter(),             // Request/response logging
]
```

**Best for:**
- Database error handling
- HTTP exception formatting
- Logging and monitoring
- CORS errors
- Authentication errors

### Controller-Level Filters (with `@UseFilters()`)

Use for **specific business logic** that only applies to certain routes:

```typescript
@Controller("/payments")
@UseFilters(PaymentExceptionFilter)  // Only for payment routes
export class PaymentsController {
  // ...
}
```

**Best for:**
- Payment processing errors
- Third-party API errors (specific to a feature)
- Feature-specific validation
- Custom business logic errors

## Guards and Pipes

The same pattern applies to Guards and Pipes:

### Global Guards

```typescript
const app = await KarinFactory.create(new HonoAdapter(), {
  scan: "./src/**/*.ts",
  globalGuards: [
    new RateLimitGuard(),  // Apply rate limiting to all routes
  ],
});
```

### Global Pipes

```typescript
const app = await KarinFactory.create(new HonoAdapter(), {
  scan: "./src/**/*.ts",
  globalPipes: [
    new ValidationPipe(),  // Validate all request bodies
    new TransformPipe(),   // Transform all responses
  ],
});
```

## Migration Guide

### Before (Incorrect)

```typescript
const app = await KarinFactory.create(adapter, {
  scan: "./src/**/*.ts",
});

// ❌ Too late!
app.useGlobalFilters(new MongooseExceptionFilter());
app.useGlobalGuards(new AuthGuard());
app.useGlobalPipes(new ValidationPipe());
```

### After (Correct)

```typescript
const app = await KarinFactory.create(adapter, {
  scan: "./src/**/*.ts",
  // ✅ Perfect timing!
  globalFilters: [new MongooseExceptionFilter()],
  globalGuards: [new AuthGuard()],
  globalPipes: [new ValidationPipe()],
});
```

## Troubleshooting

### My global filter isn't catching errors

**Cause:** You registered it after `KarinFactory.create()`.

**Solution:** Move it to the `globalFilters` option:

```typescript
const app = await KarinFactory.create(adapter, {
  scan: "./src/**/*.ts",
  globalFilters: [new MyFilter()],  // ✅ Here
});

// app.useGlobalFilters(new MyFilter());  // ❌ Not here
```

### I need to use ConfigService in my filter

**Cause:** Filters are instantiated before plugins.

**Solution:** Use lazy resolution or inject ConfigService in the filter:

```typescript
import { container } from "@karin-js/core";

@Catch(SomeError)
export class MyFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    // ✅ Get config from DI container
    const config = container.resolve(ConfigService);
    const apiKey = config.get("API_KEY");
    // ...
  }
}
```

Or use a factory function:

```typescript
const config = new ConfigPlugin({ ... });

const app = await KarinFactory.create(adapter, {
  scan: "./src/**/*.ts",
  plugins: [config],
  globalFilters: [
    // ✅ Create filter after config is available
    new MyFilter(config.get("SOME_VALUE")),
  ],
});
```

### Controller-level filters still work, right?

**Yes!** Controller-level filters with `@UseFilters()` still work perfectly:

```typescript
@Controller("/bookings")
@UseFilters(BookingExceptionFilter)  // ✅ Still works
export class BookingsController {
  // ...
}
```

The difference is:
- **Global filters** (in `KarinFactory.create()`) apply to **all routes**
- **Controller filters** (with `@UseFilters()`) apply to **specific controllers/routes**

## Best Practices

### 1. Order Matters

Filters are executed in **reverse order** (last registered, first executed):

```typescript
globalFilters: [
  new MongooseExceptionFilter(),  // Executes second
  new HttpErrorFilter(),           // Executes first
]
```

### 2. Specific Before Generic

Put specific filters before generic ones:

```typescript
globalFilters: [
  new MongooseExceptionFilter(),  // Specific (Mongoose errors)
  new HttpErrorFilter(),           // Generic (all HTTP errors)
]
```

### 3. Don't Mix Patterns

```typescript
// ❌ BAD: Mixing global and post-create registration
const app = await KarinFactory.create(adapter, {
  globalFilters: [new Filter1()],
});
app.useGlobalFilters(new Filter2());  // Won't work as expected!

// ✅ GOOD: All in one place
const app = await KarinFactory.create(adapter, {
  globalFilters: [new Filter1(), new Filter2()],
});
```

## Summary

| Approach | Works? | Why? |
|----------|--------|------|
| `globalFilters` in `KarinFactory.create()` | ✅ Yes | Registered before route scanning |
| `app.useGlobalFilters()` after `create()` | ❌ No | Registered after routes are already set up |
| `@UseFilters()` on controller | ✅ Yes | Applied during route registration |

**Golden Rule:** Always use `globalFilters`, `globalGuards`, and `globalPipes` in `KarinFactory.create()` options, never with `app.useGlobal*()` after creation.
