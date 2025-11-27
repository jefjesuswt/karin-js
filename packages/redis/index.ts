export * from "./src/redis.plugin";
export * from "./src/decorators";
// Re-exportamos Redis e ioredis para tipos
export { Redis } from "ioredis";
export type { RedisOptions } from "ioredis";
