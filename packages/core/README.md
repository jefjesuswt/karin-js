# @karin-js/core

The core package of Karin-JS framework, providing the foundation for building decorator-based backend applications with Bun.

## Installation

```bash
bun add @karin-js/core
```

## Overview

`@karin-js/core` provides:

- **Decorator-based routing** (`@Controller`, `@Get`, `@Post`, etc.)
- **Dependency Injection** system with TypeScript decorators
- **Guards** for route protection and authorization
- **Pipes** for data transformation and validation
- **Interceptors** for request/response manipulation
- **Exception Filters** for error handling
- **Plugin system** for extending functionality
- **HTTP adapter abstraction** for multiple runtimes

## Quick Start

```typescript
import "reflect-metadata";
import { KarinFactory, Controller, Get } from "@karin-js/core";
import { HonoAdapter } from "@karin-js/platform-hono";

@Controller("/")
class AppController {
  @Get()
  hello() {
    return { message: "Hello, Karin!" };
  }
}

const app = await KarinFactory.create(new HonoAdapter(), {
  controllers: [AppController],
});

app.listen(3000);
```

## Core Concepts

### Controllers

Controllers handle HTTP requests and define routes:

```typescript
import { Controller, Get, Post, Put, Delete, Param, Body } from "@karin-js/core";

@Controller("/users")
export class UsersController {
  @Get()
  findAll() {
    return [{ id: 1, name: "Alice" }];
  }

  @Get("/:id")
  findOne(@Param("id") id: string) {
    return { id, name: "Alice" };
  }

  @Post()
  create(@Body() body: any) {
    return { id: 2, ...body };
  }

  @Put("/:id")
  update(@Param("id") id: string, @Body() body: any) {
    return { id, ...body };
  }

  @Delete("/:id")
  remove(@Param("id") id: string) {
    return { deleted: true };
  }
}
```

### Services & Dependency Injection

Services encapsulate business logic and can be injected:

```typescript
import { Service } from "@karin-js/core";

@Service()
export class UsersService {
  private users = [{ id: 1, name: "Alice" }];

  findAll() {
    return this.users;
  }

  findOne(id: string) {
    return this.users.find(u => u.id === parseInt(id));
  }
}

@Controller("/users")
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}
```

### Guards

Guards control access to routes:

```typescript
import { CanActivate, ExecutionContext, UnauthorizedException } from "@karin-js/core";

@Service()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.get("authorization");
    
    if (!token) {
      throw new UnauthorizedException("Missing authorization header");
    }
    
    return true;
  }
}

// Apply to controller
@Controller("/admin")
@UseGuards(AuthGuard)
export class AdminController {
  // All routes protected
}

// Or apply to specific route
@Get("/profile")
@UseGuards(AuthGuard)
getProfile() {
  return { user: "admin" };
}
```

### Pipes

Pipes transform and validate input:

```typescript
import { PipeTransform, BadRequestException } from "@karin-js/core";

@Service()
export class ParseIntPipe implements PipeTransform {
  transform(value: any) {
    const val = parseInt(value, 10);
    if (isNaN(val)) {
      throw new BadRequestException("Invalid number");
    }
    return val;
  }
}

@Get("/:id")
findOne(@Param("id", ParseIntPipe) id: number) {
  return { id }; // id is now a number
}
```

### Interceptors

Interceptors can modify requests and responses:

```typescript
import { KarinInterceptor, ExecutionContext, CallHandler } from "@karin-js/core";

@Service()
export class LoggingInterceptor implements KarinInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler) {
    const start = Date.now();
    const result = await next();
    const duration = Date.now() - start;
    
    console.log(`Request took ${duration}ms`);
    return result;
  }
}

@Controller("/users")
@UseInterceptors(LoggingInterceptor)
export class UsersController {
  // All routes will be logged
}
```

### Exception Filters

Filters handle errors and format responses:

```typescript
import { Catch, ExceptionFilter, ArgumentsHost, HttpException } from "@karin-js/core";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();

    return new Response(
      JSON.stringify({
        statusCode: exception.status,
        message: exception.message,
        timestamp: new Date().toISOString(),
        path: request.url,
      }),
      {
        status: exception.status,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Register globally
const app = await KarinFactory.create(adapter, {
  scan: "./src/**/*.ts",
  globalFilters: [new HttpExceptionFilter()],
});
```

## Advanced Features

### Custom Parameter Decorators

Create your own parameter decorators:

```typescript
import { createParamDecorator, ExecutionContext } from "@karin-js/core";

export const User = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user; // Assuming user is set by a guard
});

@Get("/profile")
getProfile(@User() user: any) {
  return user;
}
```

### Fast Routes

Bypass guards/pipes/interceptors for maximum performance:

```typescript
import { Fast } from "@karin-js/core";

@Get("/health")
@Fast()
health() {
  return { status: "ok" };
}
```

### Plugin System

Extend the framework with plugins:

```typescript
import { KarinPlugin, KarinApplication } from "@karin-js/core";

export class MyPlugin implements KarinPlugin {
  name = "MyPlugin";

  install(app: KarinApplication) {
    // Register services, configure DI, etc.
  }

  async onPluginInit() {
    // Initialize connections, etc.
  }

  async onPluginDestroy() {
    // Cleanup
  }
}

const app = await KarinFactory.create(adapter, {
  plugins: [new MyPlugin()],
});
```

## API Reference

### Decorators

#### Route Decorators
- `@Controller(path?: string)` - Define a controller
- `@Get(path?: string)` - HTTP GET
- `@Post(path?: string)` - HTTP POST
- `@Put(path?: string)` - HTTP PUT
- `@Patch(path?: string)` - HTTP PATCH
- `@Delete(path?: string)` - HTTP DELETE
- `@Fast()` - Bypass middleware for performance

#### Parameter Decorators
- `@Param(key?: string)` - Route parameter
- `@Query(key?: string)` - Query string parameter
- `@Body()` - Request body
- `@Headers(key?: string)` - Request headers
- `@Req()` - Full request object
- `@Res()` - Full response object

#### Enhancement Decorators
- `@UseGuards(...guards)` - Apply guards
- `@UsePipes(...pipes)` - Apply pipes
- `@UseInterceptors(...interceptors)` - Apply interceptors
- `@UseFilters(...filters)` - Apply exception filters

#### Service Decorator
- `@Service()` - Register as singleton in DI container

#### Filter Decorator
- `@Catch(...exceptions)` - Specify which exceptions to catch

### Classes

#### KarinFactory
- `create(adapter, options)` - Create a Karin application

#### KarinApplication
- `listen(port, callback?)` - Start the server
- `use(plugin)` - Register a plugin
- `enableCors(options?)` - Enable CORS
- `useGlobalFilters(...filters)` - Register global filters
- `useGlobalGuards(...guards)` - Register global guards
- `useGlobalPipes(...pipes)` - Register global pipes

### Exceptions
- `HttpException(message, status)` - Base HTTP exception
- `BadRequestException(message?)` - 400
- `UnauthorizedException(message?)` - 401
- `ForbiddenException(message?)` - 403
- `NotFoundException(message?)` - 404
- `InternalServerErrorException(message?)` - 500

## Performance Optimizations

The core package includes several performance optimizations:

### DI Cache
Pre-resolves and caches dependency injection instances for faster request handling.

### Metadata Cache
Pre-compiles route metadata during bootstrap to eliminate runtime overhead.

### Fast Decorator
Bypasses guards, pipes, and interceptors for maximum performance on specific routes.

## Testing

The core package includes comprehensive tests:

```bash
bun test packages/core/test
```

See [test documentation](./test/README.md) for details.

## TypeScript Configuration

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "target": "ES2022",
    "module": "ESNext"
  }
}
```

## License

MIT
