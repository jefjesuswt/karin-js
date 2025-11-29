# @karin-js/openapi

OpenAPI/Swagger documentation plugin for Karin-JS.

## Installation

```bash
bun add @karin-js/openapi
```

## Overview

The OpenAPI plugin provides:
- ✅ Automatic OpenAPI 3.0 spec generation
- ✅ Swagger UI integration
- ✅ JSON schema validation
- ✅ Route documentation with decorators
- ✅ Type-safe request/response schemas

## Quick Start

```typescript
import { OpenApiPlugin } from "@karin-js/openapi";

const app = await KarinFactory.create(adapter, {
  plugins: [
    new OpenApiPlugin({
      path: "/docs",
      title: "My API",
      version: "1.0.0",
    }),
  ],
});

// Visit http://localhost:3000/docs for Swagger UI
// Visit http://localhost:3000/docs/json for OpenAPI spec
```

## Features

### Automatic Documentation

Routes are automatically documented:

```typescript
@Controller("/users")
export class UsersController {
  @Get()
  findAll() {
    return [{ id: 1, name: "Alice" }];
  }

  @Post()
  create(@Body() body: any) {
    return { id: 2, ...body };
  }
}
```

### Schema Validation

Document request/response schemas:

```typescript
import { ApiBody, ApiResponse } from "@karin-js/openapi";
import { z } from "zod";

const CreateUserSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  age: z.number().min(18),
});

@Controller("/users")
export class UsersController {
  @Post()
  @ApiBody(CreateUserSchema)
  @ApiResponse(201, z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  }))
  create(@Body(ZodValidationPipe) body: z.infer<typeof CreateUserSchema>) {
    return { id: 1, ...body };
  }
}
```

### Route Descriptions

Add descriptions and tags:

```typescript
import { ApiTags, ApiOperation } from "@karin-js/openapi";

@Controller("/users")
@ApiTags("Users")
export class UsersController {
  @Get()
  @ApiOperation({
    summary: "Get all users",
    description: "Returns a list of all users in the system",
  })
  findAll() {
    return [];
  }
}
```

### Lazy Configuration

Use with ConfigPlugin:

```typescript
const config = new ConfigPlugin();

const app = await KarinFactory.create(adapter, {
  plugins: [
    config,
    new OpenApiPlugin({
      path: () => config.get("DOCS_PATH") || "/docs",
      title: () => config.get("API_TITLE") || "My API",
      version: () => config.get("API_VERSION") || "1.0.0",
    }),
  ],
});
```

## Configuration

### OpenApiPlugin Options

```typescript
interface OpenApiPluginOptions {
  // Path to Swagger UI (default: "/docs")
  path?: string | (() => string);

  // API title (default: "API Documentation")
  title?: string | (() => string);

  // API version (default: "1.0.0")
  version?: string | (() => string);
}
```

## Decorators

### Class Decorators

- `@ApiTags(...tags)` - Group endpoints by tags

### Method Decorators

- `@ApiOperation(options)` - Describe an endpoint
- `@ApiBody(schema)` - Document request body
- `@ApiResponse(status, schema)` - Document response
- `@ApiParam(name, options)` - Document path parameter
- `@ApiQuery(name, options)` - Document query parameter

## Accessing Documentation

Once configured, access your API documentation at:

- **Swagger UI**: `http://localhost:3000/docs`
- **OpenAPI JSON**: `http://localhost:3000/docs/json`

## Example

```typescript
import { Controller, Get, Post, Body, Param } from "@karin-js/core";
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiParam } from "@karin-js/openapi";
import { z } from "zod";

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});

const CreateUserSchema = UserSchema.omit({ id: true });

@Controller("/users")
@ApiTags("Users")
export class UsersController {
  @Get()
  @ApiOperation({
    summary: "List all users",
    description: "Returns a paginated list of users",
  })
  @ApiResponse(200, z.array(UserSchema))
  findAll() {
    return [{ id: 1, name: "Alice", email: "alice@example.com" }];
  }

  @Get("/:id")
  @ApiOperation({ summary: "Get user by ID" })
  @ApiParam("id", { description: "User ID", type: "number" })
  @ApiResponse(200, UserSchema)
  @ApiResponse(404, z.object({ message: z.string() }))
  findOne(@Param("id") id: string) {
    return { id: parseInt(id), name: "Alice", email: "alice@example.com" };
  }

  @Post()
  @ApiOperation({ summary: "Create a new user" })
  @ApiBody(CreateUserSchema)
  @ApiResponse(201, UserSchema)
  create(@Body() body: z.infer<typeof CreateUserSchema>) {
    return { id: 2, ...body };
  }
}
```

## Best Practices

1. **Use Zod schemas** for type safety and validation
2. **Document all endpoints** for better API discoverability
3. **Use tags** to organize endpoints
4. **Provide examples** in schemas when possible
5. **Keep descriptions concise** but informative

## License

MIT
