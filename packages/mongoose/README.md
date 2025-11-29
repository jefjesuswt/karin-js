# @karin-js/mongoose

MongoDB integration plugin for Karin-JS using Mongoose ODM with enterprise-grade error handling.

## Installation

```bash
bun add @karin-js/mongoose mongoose
```

## Overview

The Mongoose plugin provides:
- ✅ MongoDB connection management
- ✅ Schema-based models with decorators
- ✅ Automatic error handling (ValidationError, CastError, etc.)
- ✅ Dependency injection for models
- ✅ Lazy configuration resolution

## Quick Start

```typescript
import { Schema, Prop, InjectModel } from "@karin-js/mongoose";
import { Model } from "mongoose";

// Define a schema
@Schema()
class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  age?: number;
}

// Use in a service
@Service()
class UsersService {
  constructor(@InjectModel(User) private userModel: Model<User>) {}

  async create(data: Partial<User>) {
    return this.userModel.create(data);
  }

  async findAll() {
    return this.userModel.find();
  }
}

// Configure plugin
const app = await KarinFactory.create(adapter, {
  plugins: [
    new MongoosePlugin({
      uri: "mongodb://localhost:27017/mydb",
    }),
  ],
});
```

## Features

### Schema Decorators

Define MongoDB schemas with TypeScript decorators:

```typescript
import { Schema, Prop } from "@karin-js/mongoose";

@Schema({ timestamps: true })
class Product {
  @Prop({ required: true, minlength: 3 })
  name: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}
```

### Model Injection

Inject models into services:

```typescript
import { InjectModel } from "@karin-js/mongoose";
import { Model } from "mongoose";

@Service()
class ProductsService {
  constructor(@InjectModel(Product) private productModel: Model<Product>) {}

  async findByTag(tag: string) {
    return this.productModel.find({ tags: tag });
  }
}
```

### Automatic Error Handling

The plugin automatically handles Mongoose errors:

```typescript
// ValidationError → 400 Bad Request
{
  "statusCode": 400,
  "error": "Validation Error",
  "message": "The provided data is invalid",
  "details": [
    {
      "field": "email",
      "message": "Path `email` is invalid (not-an-email)."
    }
  ]
}

// CastError → 400 Bad Request
{
  "statusCode": 400,
  "error": "Invalid ID",
  "message": "The value 'invalid-id' is not a valid ID"
}

// Duplicate Key → 409 Conflict
{
  "statusCode": 409,
  "error": "Duplicate Entry",
  "message": "A record with this email already exists"
}
```

### Lazy Configuration

Use with ConfigPlugin for dynamic configuration:

```typescript
const config = new ConfigPlugin({
  requiredKeys: ["MONGO_URI", "DB_NAME"],
});

const app = await KarinFactory.create(adapter, {
  plugins: [
    config,
    new MongoosePlugin({
      uri: () => config.get("MONGO_URI"),
      options: () => ({
        dbName: config.get("DB_NAME"),
        authSource: "admin",
      }),
    }),
  ],
});
```

### Serverless Mode

For serverless deployments, manually specify models:

```typescript
new MongoosePlugin({
  uri: "mongodb://...",
  models: [User, Product, Order], // Explicitly list models
})
```

## API

### MongoosePlugin Options

```typescript
interface MongoosePluginOptions {
  // MongoDB connection URI
  uri: string | (() => string);

  // Mongoose connection options
  options?: ConnectOptions | (() => ConnectOptions);

  // Models to register (for serverless)
  models?: Function[];

  // Auto-register exception filter (default: true)
  autoRegisterExceptionFilter?: boolean;
}
```

### Decorators

- `@Schema(options?)` - Define a Mongoose schema
- `@Prop(options?)` - Define a schema property
- `@InjectModel(model)` - Inject a Mongoose model

### Error Filter

Disable automatic error handling if needed:

```typescript
new MongoosePlugin({
  uri: "...",
  autoRegisterExceptionFilter: false, // Provide your own filter
})
```

## Best Practices

1. **Use schemas** for data validation
2. **Inject models** instead of importing them
3. **Enable timestamps** for audit trails
4. **Use indexes** for performance
5. **Handle errors** at the service layer when needed

## License

MIT
