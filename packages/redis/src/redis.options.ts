import type { RedisOptions } from "ioredis";

export type RedisFailureStrategy = "fail" | "warn";

export type KarinRedisConfig =
  | string
  | RedisOptions
  | {
      url?: string;
      options?: RedisOptions;

      failureStrategy?: RedisFailureStrategy;
    };
