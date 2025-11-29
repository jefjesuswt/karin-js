# @karin-js/cli

Command-line interface for scaffolding and managing Karin-JS projects.

## Installation

```bash
# Global installation (recommended)
bun install -g @karin-js/cli

# Or use with bunx (no installation needed)
bunx @karin-js/cli
```

## Commands

### Create New Project

The `new` command creates a new Karin-JS project with an interactive setup:

```bash
# Interactive mode (recommended)
karin new

# Or specify project name
karin new my-project
```

**Interactive Prompts:**

1. **Project Name** - Name of your project
2. **Environment** - Choose between:
   - Traditional Server (Bun)
   - Serverless / Edge (Cloudflare Workers, Deno Deploy)
3. **Framework Adapter** - Choose between:
   - H3 (High Performance)
   - Hono (Web Standards, Edge-optimized)
4. **Platform** (if serverless) - Choose between:
   - Cloudflare Workers
   - Deno Deploy
5. **Git Initialization** - Initialize a git repository
6. **Install Dependencies** - Install dependencies with Bun

**Available Templates:**

The CLI downloads templates from GitHub based on your selections:

- `karin-template-h3` - Traditional server with H3 adapter
- `karin-template-hono` - Traditional server with Hono adapter
- `karin-template-hono-cloudflare` - Cloudflare Workers with Hono
- `karin-template-hono-deno` - Deno Deploy with Hono
- `karin-template-h3-cloudflare` - Cloudflare Workers with H3
- `karin-template-h3-deno` - Deno Deploy with H3

### Generate Code

Generate controllers, services, and other components:

```bash
# Generate a controller
karin generate controller users

# Generate a service
karin generate service users

# Short form with alias
karin g controller users
karin g service users
```

**Available Generators:**

- `controller` - Generate a new controller
- `service` - Generate a new service
- `guard` - Generate a new guard
- `filter` - Generate a new exception filter
- `decorator` - Generate a custom decorator
- `plugin` - Generate a new plugin

**Options:**

- `-d, --dry-run` - Preview changes without creating files

**Examples:**

```bash
# Generate a users controller
karin g controller users
# Creates: src/users/users.controller.ts

# Generate a users service
karin g service users
# Creates: src/users/users.service.ts

# Dry run to preview
karin g controller posts --dry-run
```

### Check Project Health

Verify your TypeScript configuration:

```bash
karin doctor
```

This command checks:
- ✅ `tsconfig.json` exists
- ✅ `experimentalDecorators` is enabled
- ✅ `emitDecoratorMetadata` is enabled
- ✅ `strict` mode is enabled

### Display Project Info

Show CLI and system information:

```bash
karin info
```

Displays:
- CLI version
- Operating system
- Bun version
- Framework status

## Generated File Structure

### Controller

```typescript
// src/users/users.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param } from "@karin-js/core";
import { UsersService } from "./users.service";

@Controller("/users")
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get("/:id")
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.usersService.create(body);
  }

  @Put("/:id")
  update(@Param("id") id: string, @Body() body: any) {
    return this.usersService.update(id, body);
  }

  @Delete("/:id")
  remove(@Param("id") id: string) {
    return this.usersService.remove(id);
  }
}
```

### Service

```typescript
// src/users/users.service.ts
import { Service } from "@karin-js/core";

@Service()
export class UsersService {
  findAll() {
    return [];
  }

  findOne(id: string) {
    return { id };
  }

  create(data: any) {
    return { id: "1", ...data };
  }

  update(id: string, data: any) {
    return { id, ...data };
  }

  remove(id: string) {
    return { id, deleted: true };
  }
}
```

### Guard

```typescript
// src/guards/auth.guard.ts
import { CanActivate, ExecutionContext, UnauthorizedException } from "@karin-js/core";

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
```

### Filter

```typescript
// src/filters/http.filter.ts
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
```

## Workflow Examples

### Create a REST API

```bash
# Create project
karin new blog-api
# Select: Traditional Server → Hono → Yes (git) → Yes (install)

# Navigate to project
cd blog-api

# Generate resources
karin g controller posts
karin g service posts
karin g controller comments
karin g service comments

# Run the project
bun run dev
```

### Create a Serverless Function

```bash
# Create serverless project
karin new my-edge-function
# Select: Serverless → Hono → Cloudflare Workers → Yes → Yes

# Navigate and develop
cd my-edge-function
bun run dev

# Deploy to Cloudflare
wrangler deploy
```

## Tips

1. **Use the interactive mode** - `karin new` provides a guided setup
2. **Follow naming conventions** - Use plural for resources (users, posts, comments)
3. **Organize by feature** - Keep related files together (src/users/, src/posts/)
4. **Use generators** - Maintain consistency with `karin g`
5. **Check health regularly** - Run `karin doctor` to verify configuration

## Troubleshooting

### "Unknown option" errors

The CLI currently supports:
- ✅ `karin new [name]` - Interactive project creation
- ✅ `karin generate <type> [name]` or `karin g <type> [name]`
- ✅ `karin doctor` - Health check
- ✅ `karin info` - System information



### Template not found

If you see a "404" error, the template might not exist on GitHub. Available templates:
- `karin-template-h3`
- `karin-template-hono`
- `karin-template-hono-cloudflare`
- `karin-template-hono-deno`
- `karin-template-h3-cloudflare`
- `karin-template-h3-deno`

### TypeScript errors

Run `karin doctor` to verify your `tsconfig.json` has the required settings:
- `experimentalDecorators: true`
- `emitDecoratorMetadata: true`
- `strict: true`

## License

MIT
