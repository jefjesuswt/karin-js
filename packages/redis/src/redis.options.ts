import type { RedisOptions } from "ioredis";

export type RedisFailureStrategy = "fail" | "warn";

export type KarinRedisConfig =
  | string
  | (() => string)
  | RedisOptions
  | (() => RedisOptions)
  | {
    url?: string | (() => string);
    options?: RedisOptions | (() => RedisOptions);
    failureStrategy?: RedisFailureStrategy;
  };
